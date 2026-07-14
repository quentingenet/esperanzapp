import { addDays, parse } from "date-fns";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import i18n from "@/i18n";
import { getAllHabitLogs, getAllHabits } from "@/db";
import { NOTIF_DOMAIN_OFFSET } from "@/hooks/useNotifications";
import { GRADES } from "./grades";
import { logError } from "@/utils/logger";
import { stableHash31 } from "./stableHash31";
import type { HabitLog } from "@/types";

// Slot cap must satisfy slot * GRADES.length + (GRADES.length - 1) < 1_000_000 so the
// highest possible id never reaches the next domain (NOTIF_DOMAIN_OFFSET.positiveHabits).
// With GRADES.length === 23, 43_478 would overflow by 16 (2_000_000 + 43_478*23 + 22 =
// 3_000_016); 43_477 is the largest safe value (max id = 2_999_993).
const MAX_MILESTONE_SLOT = 43_477;

// The stableHash31 fallback below is currently unreachable: Habit.id is always a positive-
// integer string, whether created locally (AUTOINCREMENT) or imported (isPosIntStr in
// exportSerialization.ts rejects anything else). It exists as defense-in-depth only - see the
// equivalent note on getNotificationId in useNotifications.ts.
export function getMilestoneNotificationId(habitId: string, gradeIndex: number): number {
  const numericId = parseInt(habitId, 10);
  const slot =
    Number.isInteger(numericId) &&
    numericId > 0 &&
    numericId <= MAX_MILESTONE_SLOT &&
    String(numericId) === habitId
      ? numericId
      : stableHash31(habitId) % MAX_MILESTONE_SLOT;
  return NOTIF_DOMAIN_OFFSET.milestones + slot * GRADES.length + gradeIndex;
}

export async function cancelMilestoneNotifications(habitId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const ids = GRADES.map((_, i) => ({ id: getMilestoneNotificationId(habitId, i) }));
  await LocalNotifications.cancel({ notifications: ids }).catch((e: unknown) => {
    logError("cancelMilestoneNotifications", e);
  });
}

export async function scheduleMilestoneNotifications(
  habitId: string,
  streakStartDate: string,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.checkPermissions().catch(() => ({
    display: "denied" as const,
  }));
  // Notifications are best-effort: if permission isn't granted, we return silently.
  // Home.tsx shows a persistent banner when notifPermGranted===false so the user
  // can grant permission later; rescheduleAllMilestoneNotifications() is then called.
  if (display !== "granted") return;

  const start = parse(streakStartDate, "yyyy-MM-dd", new Date());
  const now = new Date();
  // Allow same-day milestones even if their scheduled hour is already past:
  // rescheduleAllMilestoneNotifications() cancels ALL pending alarms then reschedules,
  // so if the app opens at 10:05 on a milestone day, the 10:00 alarm was cancelled and
  // `target <= now` would drop it entirely. Scheduling a past-time notification with
  // setExactAndAllowWhileIdle fires it immediately, which is far better than silence.
  // Only milestones from previous days are skipped (truly missed).
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Each grade fires at a different time of day (10:00, 10:10, 10:20 …) so that multiple
  // habits reaching different milestones on the same day don't all ping simultaneously.
  // Android 7+ also groups notifications with the same `group` key into a collapsible stack.
  const BASE_MINUTES = 10 * 60;
  const STAGGER_MINUTES = 10;

  const notifications = GRADES.map((grade, i) => {
    const target = addDays(start, grade.threshold);
    const totalMin = BASE_MINUTES + i * STAGGER_MINUTES;
    target.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
    if (target < startOfToday) return null;

    const label = i18n.t(grade.labelKey);
    const message = i18n.t(grade.messageKey);
    const daysLabel = i18n.t("common.day", { count: grade.threshold });

    return {
      id: getMilestoneNotificationId(habitId, i),
      title: `${grade.emoji} ${String(grade.threshold)} ${daysLabel} - ${label}`,
      body: message,
      group: "milestones",
      schedule: { at: target, allowWhileIdle: true },
    };
  }).filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifications.length === 0) return;
  // Best-effort: never block the caller on a scheduling failure (e.g. Android's exact-alarm
  // system limit). Unlike scheduleReminder, this isn't a single interactive action with a UI
  // banner to update, so we can't surface it to the user here - but it must not be silent:
  // rescheduleAllMilestoneNotifications' own try/catch never sees this, since the failure
  // is swallowed at this level, so without logging it here it would be invisible everywhere.
  await LocalNotifications.schedule({ notifications }).catch((e: unknown) => {
    logError("scheduleMilestoneNotifications", e);
  });
}

function getStreakStart(logs: HabitLog[]): string | null {
  let latest: string | null = null;
  for (const log of logs) {
    if (log.eventType === "start") {
      const d = log.eventDate.slice(0, 10);
      if (!latest || d > latest) latest = d;
    }
  }
  return latest;
}

export async function rescheduleAllMilestoneNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const habits = await getAllHabits();
    const allLogs = await getAllHabitLogs();

    const logsByHabit = new Map<string, HabitLog[]>(habits.map((h) => [h.id, []]));
    for (const log of allLogs) {
      logsByHabit.get(log.habitId)?.push(log);
    }

    // Build expected IDs for all live habits before cancel/schedule so the orphan
    // purge below can identify notifications from since-deleted habits.
    const expectedIds = new Set<number>(
      habits.flatMap((h) => GRADES.map((_, i) => getMilestoneNotificationId(h.id, i))),
    );

    for (const habit of habits) {
      const streakStart = getStreakStart(logsByHabit.get(habit.id) ?? []);
      if (!streakStart) continue;
      await cancelMilestoneNotifications(habit.id);
      await scheduleMilestoneNotifications(habit.id, streakStart);
    }

    // Purge milestone notifications whose habit was deleted. Mirrors rescheduleAll() for treatments.
    const MILESTONES_DOMAIN_END = NOTIF_DOMAIN_OFFSET.milestones + 1_000_000;
    // If getPending() fails (plugin timeout, Android restriction), skip the orphan purge
    // rather than aborting the whole reschedule. Orphans will be caught on the next boot.
    const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
    const orphans = pending.notifications.filter(
      (n) =>
        n.id >= NOTIF_DOMAIN_OFFSET.milestones &&
        n.id < MILESTONES_DOMAIN_END &&
        !expectedIds.has(n.id),
    );
    if (orphans.length > 0) {
      await LocalNotifications.cancel({ notifications: orphans.map((n) => ({ id: n.id })) }).catch(
        () => {},
      );
    }
  } catch (e) {
    logError("rescheduleAllMilestoneNotifications", e);
  }
}

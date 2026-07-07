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

export function getMilestoneNotificationId(habitId: string, gradeIndex: number): number {
  const numericId = parseInt(habitId, 10);
  const slot =
    Number.isInteger(numericId) && numericId > 0 && numericId <= 49_999 && String(numericId) === habitId
      ? numericId
      : stableHash31(habitId) % 49_999;
  return NOTIF_DOMAIN_OFFSET.milestones + slot * GRADES.length + gradeIndex;
}

export async function cancelMilestoneNotifications(habitId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const ids = GRADES.map((_, i) => ({ id: getMilestoneNotificationId(habitId, i) }));
  await LocalNotifications.cancel({ notifications: ids }).catch(() => {});
}

export async function scheduleMilestoneNotifications(
  habitId: string,
  habitLabel: string,
  streakStartDate: string,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
  if (display !== "granted") return;

  const start = parse(streakStartDate, "yyyy-MM-dd", new Date());
  const now = new Date();

  // Each grade fires at a different time of day (10:00, 10:10, 10:20 …) so that multiple
  // habits reaching different milestones on the same day don't all ping simultaneously.
  // Android 7+ also groups notifications with the same `group` key into a collapsible stack.
  const BASE_MINUTES = 10 * 60;
  const STAGGER_MINUTES = 10;

  const notifications = GRADES
    .map((grade, i) => {
      const target = addDays(start, grade.days);
      const totalMin = BASE_MINUTES + i * STAGGER_MINUTES;
      target.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
      if (target <= now) return null;

      const label = i18n.t(grade.labelKey);
      const message = i18n.t(grade.messageKey);
      const daysLabel = i18n.t("common.day", { count: grade.days });

      return {
        id: getMilestoneNotificationId(habitId, i),
        title: `${grade.emoji} ${String(grade.days)} ${daysLabel} - ${label}`,
        body: `${message} - ${habitLabel}`,
        group: "milestones",
        schedule: { at: target, allowWhileIdle: true },
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifications.length === 0) return;
  await LocalNotifications.schedule({ notifications }).catch(() => {});
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

    for (const habit of habits) {
      const streakStart = getStreakStart(logsByHabit.get(habit.id) ?? []);
      if (!streakStart) continue;
      await cancelMilestoneNotifications(habit.id);
      await scheduleMilestoneNotifications(habit.id, habit.label, streakStart);
    }
  } catch (e) {
    logError("rescheduleAllMilestoneNotifications", e);
  }
}

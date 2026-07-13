import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import i18n from "@/i18n";
import { getNotificationId } from "@/hooks/useNotifications";
import { hasNotifiedMilestone, markMilestoneNotified } from "@/db";
import { POSITIVE_GRADES } from "./positiveGrades";
import type { PositiveHabit } from "@/types";

// Reactive, not pre-scheduled: unlike GRADES (streak days, predictable calendar dates ahead
// of time), a positive-habit milestone ("50th completion") depends on actual check-ins and
// can't be scheduled in advance. Fired immediately the moment a "taken" log pushes the
// cumulative count onto a POSITIVE_GRADES threshold. This intentionally does not reuse the
// pre-scheduling machinery in milestoneNotifications.ts (orphan purge, 12-month renewal) —
// there is nothing pending to purge or renew for a one-shot fired at the moment it happens.
export async function checkAndNotifyPositiveMilestone(
  positiveHabit: PositiveHabit,
  newTakenCount: number,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const gradeEntry = POSITIVE_GRADES.map((grade, index) => ({ grade, index })).find(
    (e) => e.grade.threshold === newTakenCount,
  );
  if (!gradeEntry) return;
  const { grade, index: gradeIndex } = gradeEntry;

  // Toggling a day's status off and back on (taken → missed → taken) can make the cumulative
  // count cross the same threshold more than once; only notify the first time it's reached.
  if (await hasNotifiedMilestone(positiveHabit.id, grade.threshold)) return;

  const { display } = await LocalNotifications.checkPermissions().catch(() => ({
    display: "denied" as const,
  }));
  if (display !== "granted") return;

  const label = i18n.t(grade.labelKey);
  const message = i18n.t(grade.messageKey);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: getNotificationId("buildMilestones", `${positiveHabit.id}~${String(gradeIndex)}`),
        title: `${grade.emoji} ${label}`,
        body: message,
        group: "buildMilestones",
        schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
      },
    ],
  }).catch(() => {});
  await markMilestoneNotified(positiveHabit.id, grade.threshold);
}

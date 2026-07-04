import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Weekday } from "@capacitor/local-notifications";
import i18n from "@/i18n";
import type { Treatment } from "@/types";

export const NOTIF_DOMAIN_OFFSET = {
  treatments: 1_000_000,
  milestones: 2_000_000, // reserved for future milestone notifications
} as const;

export type NotifDomain = keyof typeof NOTIF_DOMAIN_OFFSET;

function stableHash31(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return (h & 0x7fffffff) || 1; // positive 31-bit, never 0
}

export function getNotificationId(domain: NotifDomain, id: string): number {
  const offset = NOTIF_DOMAIN_OFFSET[domain];
  const hash = stableHash31(id) % 999_999; // keeps result in [0, 999_998]
  return offset + hash;
}

// JS getDay() (0=Sun..6=Sat) -> Capacitor Weekday (Sunday=1..Saturday=7)
const JS_TO_CAPACITOR_WEEKDAY: Record<number, Weekday> = {
  0: Weekday.Sunday,
  1: Weekday.Monday,
  2: Weekday.Tuesday,
  3: Weekday.Wednesday,
  4: Weekday.Thursday,
  5: Weekday.Friday,
  6: Weekday.Saturday,
};
function jsWeekdayToCapacitor(jsDay: number): Weekday {
  return JS_TO_CAPACITOR_WEEKDAY[jsDay] ?? Weekday.Monday;
}

// Used only for monthly "last day of month" which ScheduleOn cannot express
function lastDayOfMonthOccurrence(reminderTime: string): Date {
  const [h, m] = reminderTime.split(":").map(Number) as [number, number];
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  candidate.setHours(h, m, 0, 0);
  if (candidate <= now) {
    const next = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    next.setHours(h, m, 0, 0);
    return next;
  }
  return candidate;
}

export function useNotifications() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    const { display } = await LocalNotifications.requestPermissions().catch(() => ({ display: "denied" as const }));
    return display === "granted";
  }, []);

  const scheduleReminder = useCallback(
    async (treatment: Treatment, _fromTomorrow = false): Promise<"scheduled" | "permission-denied" | "disabled" | "error"> => {
      if (!Capacitor.isNativePlatform()) return "disabled";
      const id = getNotificationId("treatments", treatment.id);
      await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
      if (!treatment.reminderEnabled) return "disabled";
      const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
      if (display !== "granted") return "permission-denied";

      const [h, m] = treatment.reminderTime.split(":").map(Number) as [number, number];

      try {
        if (treatment.frequency === "daily") {
          // ScheduleOn fires at exact hour:minute every day (uses setExactAndAllowWhileIdle on Android)
          await LocalNotifications.schedule({
            notifications: [{
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { hour: h, minute: m } },
            }],
          });
        } else if (treatment.frequency === "weekly") {
          const weekday = treatment.reminderDay !== null
            ? jsWeekdayToCapacitor(treatment.reminderDay)
            : Weekday.Monday;
          await LocalNotifications.schedule({
            notifications: [{
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { weekday, hour: h, minute: m } },
            }],
          });
        } else {
          if (treatment.reminderDay === 0) {
            // Last day of month: ScheduleOn cannot express this, use at+repeats
            await LocalNotifications.schedule({
              notifications: [{
                id,
                title: "EsperanzApp",
                body: i18n.t("notifications.genericReminder"),
                schedule: {
                  at: lastDayOfMonthOccurrence(treatment.reminderTime),
                  repeats: true,
                  every: "month",
                },
              }],
            });
          } else {
            const day = treatment.reminderDay ?? 1;
            await LocalNotifications.schedule({
              notifications: [{
                id,
                title: "EsperanzApp",
                body: i18n.t("notifications.genericReminder"),
                schedule: { on: { day, hour: h, minute: m } },
              }],
            });
          }
        }
        return "scheduled";
      } catch {
        return "error";
      }
    },
    [],
  );

  const cancelReminder = useCallback(async (treatmentId: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    await LocalNotifications.cancel({
      notifications: [{ id: getNotificationId("treatments", treatmentId) }],
    });
  }, []);

  const rescheduleAll = useCallback(
    async (treatments: Treatment[]): Promise<void> => {
      if (!Capacitor.isNativePlatform()) return;
      const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
      const treatmentPending = pending.notifications.filter(
        (n) => n.id >= NOTIF_DOMAIN_OFFSET.treatments && n.id < NOTIF_DOMAIN_OFFSET.milestones,
      );
      if (treatmentPending.length > 0) {
        await LocalNotifications.cancel({ notifications: treatmentPending.map((n) => ({ id: n.id })) }).catch(() => {});
      }
      await Promise.allSettled(treatments.map((t) => scheduleReminder(t)));
    },
    [scheduleReminder],
  );

  return { requestPermission, scheduleReminder, cancelReminder, rescheduleAll };
}

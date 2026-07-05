import { useCallback } from "react";
import { getDaysInMonth, addMonths } from "date-fns";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Weekday } from "@capacitor/local-notifications";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
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
  // Treatment IDs are SQLite AUTOINCREMENT integers stored as strings ("1", "2", …).
  // Using the integer directly eliminates all collision risk for the common case.
  // String/UUID IDs (e.g. imported from external systems) fall back to hash % 999_999;
  // collision probability is low (~1/999_999 per pair) but non-zero.
  const numericId = parseInt(id, 10);
  // Cap at 999_999 so the slot stays within the domain range [offset, offset+999_999].
  // IDs >= 1_000_000 (e.g. from external imports) would otherwise overflow into the next domain.
  const slot = Number.isInteger(numericId) && numericId > 0 && numericId <= 999_999 && String(numericId) === id
    ? numericId
    : stableHash31(id) % 999_999;
  return offset + slot;
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


export function useNotifications() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    const { display } = await LocalNotifications.requestPermissions().catch(() => ({ display: "denied" as const }));
    return display === "granted";
  }, []);

  const scheduleReminder = useCallback(
    async (treatment: Treatment): Promise<"scheduled" | "permission-denied" | "disabled" | "error"> => {
      if (!Capacitor.isNativePlatform()) return "disabled";
      const id = getNotificationId("treatments", treatment.id);
      await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
      if (!treatment.reminderEnabled) return "disabled";
      const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
      if (display !== "granted") return "permission-denied";

      const [h, m] = treatment.reminderTime.split(":").map(Number) as [number, number];
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return "error";

      try {
        if (treatment.frequency === "daily") {
          await LocalNotifications.schedule({
            notifications: [{
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
            }],
          });
        } else if (treatment.frequency === "weekly") {
          if (treatment.reminderDay === null) return "error";
          const weekday = jsWeekdayToCapacitor(treatment.reminderDay);
          await LocalNotifications.schedule({
            notifications: [{
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { weekday, hour: h, minute: m }, allowWhileIdle: true },
            }],
          });
        } else if (treatment.reminderDay === 0) {
          // "last day of month" — Capacitor ScheduleOn has no such expression.
          // Schedule a one-shot at the real last day; AppStartRescheduler renews it at each app launch
          // and the localNotificationReceived listener renews it when fired in foreground.
          const now = new Date();
          const lastDayThisMonth = getDaysInMonth(now);
          let target = new Date(now.getFullYear(), now.getMonth(), lastDayThisMonth, h, m, 0, 0);
          if (target <= now) {
            const nextMonth = addMonths(now, 1);
            const lastDayNextMonth = getDaysInMonth(nextMonth);
            target = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), lastDayNextMonth, h, m, 0, 0);
          }
          await LocalNotifications.schedule({
            notifications: [{
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { at: target, allowWhileIdle: true },
            }],
          });
        } else {
          const day = treatment.reminderDay ?? 1;
          await LocalNotifications.schedule({
            notifications: [{
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { day, hour: h, minute: m }, allowWhileIdle: true },
            }],
          });
        }
        // Verify the notification was actually registered — guards against silent failure on
        // Android 14+ when SCHEDULE_EXACT_ALARM is not granted (affects daily, weekly, and monthly).
        const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] as Array<{ id: number }> }));
        if (!pending.notifications.some((n) => n.id === id)) return "error";
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
    }).catch(() => {});
  }, []);

  const rescheduleAll = useCallback(
    async (treatments: Treatment[]): Promise<boolean> => {
      if (!Capacitor.isNativePlatform()) return false;
      const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
      const treatmentPending = pending.notifications.filter(
        (n) => n.id >= NOTIF_DOMAIN_OFFSET.treatments && n.id < NOTIF_DOMAIN_OFFSET.milestones,
      );
      if (treatmentPending.length > 0) {
        await LocalNotifications.cancel({ notifications: treatmentPending.map((n) => ({ id: n.id })) }).catch(() => {});
      }
      const results = await Promise.allSettled(treatments.map((t) => scheduleReminder(t)));
      return results.some((r) => r.status === "fulfilled" && r.value === "error");
    },
    [scheduleReminder],
  );

  // Returns null on web (not applicable), true/false on native.
  const getPermissionStatus = useCallback(async (): Promise<boolean | null> => {
    if (!Capacitor.isNativePlatform()) return null;
    const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
    return display === "granted";
  }, []);

  // Opens the app info page where Android 12+ shows the "Alarms & Reminders" toggle.
  // Call this when scheduleReminder returns "error" to let the user grant SCHEDULE_EXACT_ALARM.
  const openExactAlarmSettings = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    }).catch(() => {});
  }, []);

  return { requestPermission, scheduleReminder, cancelReminder, rescheduleAll, getPermissionStatus, openExactAlarmSettings };
}

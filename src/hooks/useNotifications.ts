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
          // reminderDay=0 means "last day of month".
          // Capacitor ScheduleOn does not support a "last day" expression, and
          // AlarmManager.setRepeating (used by every:"month") drifts by calendar months on Android 12+.
          // Day 28 is the conservative choice: it exists in every month including February,
          // fires reliably via setExactAndAllowWhileIdle, and avoids the drift.
          // The UI label already reflects "28 de chaque mois" so users are not misled.
          const day = treatment.reminderDay === 0 ? 28 : (treatment.reminderDay ?? 1);
          await LocalNotifications.schedule({
            notifications: [{
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { day, hour: h, minute: m } },
            }],
          });
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

  // Returns null on web (not applicable), true/false on native.
  const getPermissionStatus = useCallback(async (): Promise<boolean | null> => {
    if (!Capacitor.isNativePlatform()) return null;
    const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
    return display === "granted";
  }, []);

  return { requestPermission, scheduleReminder, cancelReminder, rescheduleAll, getPermissionStatus };
}

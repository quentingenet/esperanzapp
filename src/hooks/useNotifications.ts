import { useCallback } from "react";
import { getDaysInMonth, addMonths } from "date-fns";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Weekday } from "@capacitor/local-notifications";
import { ExactAlarm } from "@/plugins/ExactAlarm";
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

// Returns 12 stable notification IDs for "last day of month" multi-shots (months 0..11 ahead).
// Uses a hash of (treatmentId + "~ld~" + monthIndex) to avoid collisions with base IDs.
// All IDs fall within [NOTIF_DOMAIN_OFFSET.treatments + 1, NOTIF_DOMAIN_OFFSET.milestones - 1].
export function getLastDayNotificationIds(treatmentId: string): number[] {
  const offset = NOTIF_DOMAIN_OFFSET.treatments;
  return Array.from({ length: 12 }, (_, i) => {
    const slot = (stableHash31(treatmentId + "~ld~" + String(i)) % 999_999) + 1;
    return offset + slot;
  });
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
      if (!treatment.reminderEnabled) return "disabled";
      const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
      if (display !== "granted") return "permission-denied";

      const [h, m] = treatment.reminderTime.split(":").map(Number) as [number, number];
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return "error";

      // Pre-cancel both the base ID and all 12 potential last-day IDs so frequency changes
      // (e.g. last-day -> daily) don't leave stale notifications in pending.
      const baseId = getNotificationId("treatments", treatment.id);
      const lastDayIds = getLastDayNotificationIds(treatment.id);
      await LocalNotifications.cancel({
        notifications: [{ id: baseId }, ...lastDayIds.map((id) => ({ id }))],
      }).catch(() => {});

      try {
        let idsToVerify: number[];

        if (treatment.frequency === "daily") {
          await LocalNotifications.schedule({
            notifications: [{
              id: baseId,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
            }],
          });
          idsToVerify = [baseId];
        } else if (treatment.frequency === "weekly") {
          if (treatment.reminderDay === null) return "error";
          const weekday = jsWeekdayToCapacitor(treatment.reminderDay);
          await LocalNotifications.schedule({
            notifications: [{
              id: baseId,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { weekday, hour: h, minute: m }, allowWhileIdle: true },
            }],
          });
          idsToVerify = [baseId];
        } else if (treatment.reminderDay === 0) {
          // "Last day of month" — Capacitor ScheduleOn has no such expression.
          // Schedule 12 one-shot notifications covering the next 12 last-day occurrences.
          // AppStartRescheduler renews this 12-month window at each cold start.
          const now = new Date();
          let startOffset = 0;
          while (startOffset < 12) {
            const candidate = addMonths(now, startOffset);
            const lastDayNum = getDaysInMonth(candidate);
            const target = new Date(candidate.getFullYear(), candidate.getMonth(), lastDayNum, h, m, 0, 0);
            if (target > now) break;
            startOffset++;
          }
          if (startOffset >= 12) return "error";

          const notifications = Array.from({ length: 12 }, (_, i) => {
            const mo = addMonths(now, startOffset + i);
            const lastDayNum = getDaysInMonth(mo);
            const target = new Date(mo.getFullYear(), mo.getMonth(), lastDayNum, h, m, 0, 0);
            const notifId = lastDayIds[i] ?? (NOTIF_DOMAIN_OFFSET.treatments + 1);
            return {
              id: notifId,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { at: target, allowWhileIdle: true },
            };
          });
          await LocalNotifications.schedule({ notifications });
          idsToVerify = lastDayIds;
        } else {
          const day = treatment.reminderDay ?? 1;
          await LocalNotifications.schedule({
            notifications: [{
              id: baseId,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: { on: { day, hour: h, minute: m }, allowWhileIdle: true },
            }],
          });
          idsToVerify = [baseId];
        }

        // Verify the notification(s) were actually registered — guards against silent failure on
        // Android 14+ when SCHEDULE_EXACT_ALARM is not granted.
        const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] as Array<{ id: number }> }));
        if (!idsToVerify.every((id) => pending.notifications.some((n) => n.id === id))) return "error";
        return "scheduled";
      } catch {
        return "error";
      }
    },
    [],
  );

  const cancelReminder = useCallback(async (treatmentId: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    const baseId = getNotificationId("treatments", treatmentId);
    const lastDayIds = getLastDayNotificationIds(treatmentId);
    await LocalNotifications.cancel({
      notifications: [{ id: baseId }, ...lastDayIds.map((id) => ({ id }))],
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

  const getExactAlarmStatus = useCallback(async (): Promise<boolean> => {
    if (Capacitor.getPlatform() !== "android") return true;
    const { value } = await ExactAlarm.canScheduleExactAlarms().catch(() => ({ value: true }));
    return value;
  }, []);

  const openExactAlarmSettings = useCallback(async (): Promise<void> => {
    if (Capacitor.getPlatform() !== "android") return;
    await ExactAlarm.requestExactAlarmPermission().catch(() => {});
  }, []);

  return { requestPermission, scheduleReminder, cancelReminder, rescheduleAll, getPermissionStatus, getExactAlarmStatus, openExactAlarmSettings };
}

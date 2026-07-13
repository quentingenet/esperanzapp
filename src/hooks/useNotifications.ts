import { useCallback } from "react";
import { getDaysInMonth, addMonths } from "date-fns";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Weekday } from "@capacitor/local-notifications";
import { ExactAlarm } from "@/plugins/ExactAlarm";
import i18n from "@/i18n";
import { stableHash31 } from "@/utils/stableHash31";
import type { Frequency } from "@/types";

export const NOTIF_DOMAIN_OFFSET = {
  treatments: 1_000_000,
  milestones: 2_000_000,
  positiveHabits: 3_000_000,
  buildMilestones: 4_000_000,
} as const;

export type NotifDomain = keyof typeof NOTIF_DOMAIN_OFFSET;

// Structural: Treatment and PositiveHabit both satisfy this shape, so the scheduling
// engine below is shared between the two domains instead of duplicated per entity.
export interface ReminderSchedulable {
  id: string;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderDay: number | null;
  frequency: Frequency;
}

export function getNotificationId(domain: NotifDomain, id: string): number {
  const offset = NOTIF_DOMAIN_OFFSET[domain];
  // Entity IDs are SQLite AUTOINCREMENT integers stored as strings ("1", "2", …).
  // Using the integer directly eliminates all collision risk for the common case.
  // String/UUID IDs (e.g. imported from external systems) fall back to (hash % 499_999) + 1;
  // collision probability is low (~1/499_999 per pair) but non-zero.
  const numericId = parseInt(id, 10);
  // Cap at 499_999 so base IDs stay in [offset+1, offset+499_999].
  // The upper half [offset+500_000, offset+999_999] is reserved for last-day one-shots.
  const slot =
    Number.isInteger(numericId) && numericId > 0 && numericId <= 499_999 && String(numericId) === id
      ? numericId
      : (stableHash31(id) % 499_999) + 1;
  return offset + slot;
}

// Returns 12 stable notification IDs for "last day of month" multi-shots (months 0..11 ahead).
// Occupies the upper half of the domain [offset+500_000, offset+999_999],
// leaving [offset+1, offset+499_999] for base entity IDs — no overlap possible.
export function getLastDayNotificationIds(
  entityId: string,
  domain: NotifDomain = "treatments",
): number[] {
  const base = NOTIF_DOMAIN_OFFSET[domain] + 500_000;
  return Array.from({ length: 12 }, (_, i) => {
    const slot = stableHash31(entityId + "~ld~" + String(i)) % 500_000;
    return base + slot;
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
    const { display } = await LocalNotifications.requestPermissions().catch(() => ({
      display: "denied" as const,
    }));
    return display === "granted";
  }, []);

  const scheduleReminder = useCallback(
    async (
      entity: ReminderSchedulable,
      domain: NotifDomain = "treatments",
    ): Promise<
      | "scheduled"
      | "permission-denied"
      | "disabled"
      | "exact-alarm-denied"
      | "schedule-failed"
      | "unverified"
    > => {
      if (!Capacitor.isNativePlatform()) return "disabled";
      if (!entity.reminderEnabled) return "disabled";
      const { display } = await LocalNotifications.checkPermissions().catch(() => ({
        display: "denied" as const,
      }));
      if (display !== "granted") return "permission-denied";

      const [h, m] = entity.reminderTime.split(":").map(Number) as [number, number];
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return "schedule-failed";

      // Domain-specific body text: "don't forget your treatment" would be wrong for a
      // positive-habit reminder (e.g. "Sport"). Other domains don't use scheduleReminder.
      const body = i18n.t(
        domain === "positiveHabits"
          ? "notifications.genericReminderPositiveHabit"
          : "notifications.genericReminder",
      );

      // Pre-cancel both the base ID and all 12 potential last-day IDs so frequency changes
      // (e.g. last-day -> daily) don't leave stale notifications in pending.
      const baseId = getNotificationId(domain, entity.id);
      const lastDayIds = getLastDayNotificationIds(entity.id, domain);
      await LocalNotifications.cancel({
        notifications: [{ id: baseId }, ...lastDayIds.map((id) => ({ id }))],
      }).catch(() => {});

      try {
        let idsToVerify: number[];

        if (entity.frequency === "daily") {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: baseId,
                title: "EsperanzApp",
                body,
                schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
              },
            ],
          });
          idsToVerify = [baseId];
        } else if (entity.frequency === "weekly") {
          if (entity.reminderDay === null) return "schedule-failed";
          const weekday = jsWeekdayToCapacitor(entity.reminderDay);
          await LocalNotifications.schedule({
            notifications: [
              {
                id: baseId,
                title: "EsperanzApp",
                body,
                schedule: { on: { weekday, hour: h, minute: m }, allowWhileIdle: true },
              },
            ],
          });
          idsToVerify = [baseId];
        } else if (entity.reminderDay === 0) {
          // "Last day of month" — Capacitor ScheduleOn has no such expression.
          // Schedule 12 one-shot notifications covering the next 12 last-day occurrences.
          // AppStartRescheduler renews this 12-month window at each cold start.
          const now = new Date();
          let startOffset = 0;
          while (startOffset < 12) {
            const candidate = addMonths(now, startOffset);
            const lastDayNum = getDaysInMonth(candidate);
            const target = new Date(
              candidate.getFullYear(),
              candidate.getMonth(),
              lastDayNum,
              h,
              m,
              0,
              0,
            );
            if (target > now) break;
            startOffset++;
          }
          if (startOffset >= 12) return "schedule-failed";

          const notifications = lastDayIds.map((notifId, i) => {
            const mo = addMonths(now, startOffset + i);
            const lastDayNum = getDaysInMonth(mo);
            const target = new Date(mo.getFullYear(), mo.getMonth(), lastDayNum, h, m, 0, 0);
            return {
              id: notifId,
              title: "EsperanzApp",
              body,
              schedule: { at: target, allowWhileIdle: true },
            };
          });
          await LocalNotifications.schedule({ notifications });
          idsToVerify = lastDayIds;
        } else {
          if (entity.reminderDay === null) return "schedule-failed";
          const day = entity.reminderDay;
          await LocalNotifications.schedule({
            notifications: [
              {
                id: baseId,
                title: "EsperanzApp",
                body,
                schedule: { on: { day, hour: h, minute: m }, allowWhileIdle: true },
              },
            ],
          });
          idsToVerify = [baseId];
        }

        // Verify the notification(s) were actually registered — guards against silent failure on
        // Android 14+ when SCHEDULE_EXACT_ALARM is not granted.
        let pending: { notifications: Array<{ id: number }> };
        try {
          pending = await LocalNotifications.getPending();
        } catch {
          return "unverified";
        }
        if (!idsToVerify.every((id) => pending.notifications.some((n) => n.id === id))) {
          if (Capacitor.getPlatform() === "android") {
            const { value: canExact } = await ExactAlarm.canScheduleExactAlarms().catch(() => ({
              value: true,
            }));
            if (!canExact) return "exact-alarm-denied";
          }
          return "schedule-failed";
        }
        return "scheduled";
      } catch {
        return "schedule-failed";
      }
    },
    [],
  );

  const cancelReminder = useCallback(
    async (entityId: string, domain: NotifDomain = "treatments"): Promise<void> => {
      if (!Capacitor.isNativePlatform()) return;
      const baseId = getNotificationId(domain, entityId);
      const lastDayIds = getLastDayNotificationIds(entityId, domain);
      await LocalNotifications.cancel({
        notifications: [{ id: baseId }, ...lastDayIds.map((id) => ({ id }))],
      }).catch(() => {});
    },
    [],
  );

  const rescheduleAll = useCallback(
    async (
      entities: ReminderSchedulable[],
      domain: NotifDomain = "treatments",
    ): Promise<boolean> => {
      if (!Capacitor.isNativePlatform()) return false;

      // Schedule first so no window exists where notifications are cancelled but not yet re-created.
      // Each scheduleReminder pre-cancels its own IDs before scheduling, so frequency changes are safe.
      const results = await Promise.allSettled(entities.map((e) => scheduleReminder(e, domain)));
      const anyFailed = results.some(
        (r) =>
          r.status === "fulfilled" &&
          (r.value === "exact-alarm-denied" || r.value === "schedule-failed"),
      );

      // Compute the IDs that are legitimately expected to be pending after scheduling.
      const expectedIds = new Set<number>();
      for (const e of entities) {
        if (!e.reminderEnabled) continue;
        if (e.frequency === "monthly" && e.reminderDay === 0) {
          for (const id of getLastDayNotificationIds(e.id, domain)) expectedIds.add(id);
        } else {
          expectedIds.add(getNotificationId(domain, e.id));
        }
      }

      // Cancel any domain IDs that are no longer expected (deleted/disabled entities).
      // Each domain occupies a fixed 1,000,000-wide ID slot (see NOTIF_DOMAIN_OFFSET).
      const domainStart = NOTIF_DOMAIN_OFFSET[domain];
      const domainEnd = domainStart + 1_000_000;
      const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
      const orphans = pending.notifications.filter(
        (n) => n.id >= domainStart && n.id < domainEnd && !expectedIds.has(n.id),
      );
      if (orphans.length > 0) {
        await LocalNotifications.cancel({
          notifications: orphans.map((n) => ({ id: n.id })),
        }).catch(() => {});
      }

      return anyFailed;
    },
    [scheduleReminder],
  );

  // Returns null on web (not applicable), true/false on native.
  const getPermissionStatus = useCallback(async (): Promise<boolean | null> => {
    if (!Capacitor.isNativePlatform()) return null;
    const { display } = await LocalNotifications.checkPermissions().catch(() => ({
      display: "denied" as const,
    }));
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

  return {
    requestPermission,
    scheduleReminder,
    cancelReminder,
    rescheduleAll,
    getPermissionStatus,
    getExactAlarmStatus,
    openExactAlarmSettings,
  };
}

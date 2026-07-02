import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import i18n from "@/i18n";
import type { Frequency, Treatment } from "@/types";

function stableHash31(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return (h & 0x7fffffff) || 1; // positive 31-bit, never 0
}

function treatmentToNotifId(treatmentId: string): number {
  return /^\d+$/.test(treatmentId) ? parseInt(treatmentId, 10) : stableHash31(treatmentId);
}

function frequencyToEvery(freq: Frequency): "day" | "week" | "month" {
  if (freq === "daily") return "day";
  if (freq === "weekly") return "week";
  return "month";
}

function nextOccurrence(
  reminderTime: string,
  frequency: Frequency,
  reminderDay: number | null,
  fromTomorrow = false,
): Date {
  const [h, m] = reminderTime.split(":").map(Number) as [number, number];
  const now = new Date();
  const d = new Date();
  d.setHours(h, m, 0, 0);

  if (frequency === "weekly" && reminderDay !== null) {
    const currentDay = now.getDay();
    let daysUntil = (reminderDay - currentDay + 7) % 7;
    if (daysUntil === 0 && d <= now) daysUntil = 7;
    d.setDate(d.getDate() + daysUntil);
  } else if (frequency === "monthly" && reminderDay !== null) {
    if (reminderDay === 0) {
      d.setMonth(d.getMonth() + 1, 0);
      if (d <= now) { d.setMonth(d.getMonth() + 2, 0); }
    } else {
      const daysNow = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(reminderDay, daysNow));
      if (d <= now) {
        d.setMonth(d.getMonth() + 1);
        const daysNext = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(reminderDay, daysNext));
      }
    }
  } else {
    if (fromTomorrow) d.setDate(d.getDate() + 1);
    else if (d <= now) d.setDate(d.getDate() + 1);
  }

  return d;
}

export function useNotifications() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  }, []);

  const scheduleReminder = useCallback(
    async (treatment: Treatment, fromTomorrow = false): Promise<"scheduled" | "permission-denied" | "disabled" | "error"> => {
      if (!Capacitor.isNativePlatform()) return "disabled";
      const id = treatmentToNotifId(treatment.id);
      await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
      if (!treatment.reminderEnabled) return "disabled";
      const { display } = await LocalNotifications.checkPermissions().catch(() => ({ display: "denied" as const }));
      if (display !== "granted") return "permission-denied";
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: "EsperanzApp",
              body: i18n.t("notifications.genericReminder"),
              schedule: {
                at: nextOccurrence(treatment.reminderTime, treatment.frequency, treatment.reminderDay, fromTomorrow),
                repeats: true,
                every: frequencyToEvery(treatment.frequency),
              },
            },
          ],
        });
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
      notifications: [{ id: treatmentToNotifId(treatmentId) }],
    });
  }, []);

  const rescheduleAll = useCallback(
    async (treatments: Treatment[]): Promise<void> => {
      if (!Capacitor.isNativePlatform()) return;
      const { notifications: pending } = await LocalNotifications.getPending();
      if (pending.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
      }
      await Promise.allSettled(treatments.map((t) => scheduleReminder(t)));
    },
    [scheduleReminder],
  );

  return { requestPermission, scheduleReminder, cancelReminder, rescheduleAll };
}

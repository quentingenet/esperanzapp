import { useCallback } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import i18n from "@/i18n";
import type { Frequency, Treatment } from "@/types";

function treatmentToNotifId(treatmentId: string): number {
  const n = parseInt(treatmentId, 10);
  return Number.isFinite(n) ? n : 0;
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
      // dernier jour du mois
      d.setMonth(d.getMonth() + 1, 0);
      if (d <= now) { d.setMonth(d.getMonth() + 2, 0); }
    } else {
      d.setDate(reminderDay);
      if (d <= now) d.setMonth(d.getMonth() + 1);
    }
  } else {
    if (fromTomorrow) d.setDate(d.getDate() + 1);
    else if (d <= now) d.setDate(d.getDate() + 1);
  }

  return d;
}

export function useNotifications() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  }, []);

  const scheduleReminder = useCallback(async (treatment: Treatment, fromTomorrow = false): Promise<void> => {
    const id = treatmentToNotifId(treatment.id);
    await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
    if (!treatment.reminderEnabled) return;
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
  }, []);

  const cancelReminder = useCallback(async (treatmentId: string): Promise<void> => {
    await LocalNotifications.cancel({
      notifications: [{ id: treatmentToNotifId(treatmentId) }],
    });
  }, []);

  const rescheduleAll = useCallback(
    async (treatments: Treatment[]): Promise<void> => {
      const { notifications: pending } = await LocalNotifications.getPending();
      if (pending.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
      }
      for (const treatment of treatments) {
        await scheduleReminder(treatment);
      }
    },
    [scheduleReminder],
  );

  return { requestPermission, scheduleReminder, cancelReminder, rescheduleAll };
}

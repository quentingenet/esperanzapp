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

function nextOccurrence(reminderTime: string, fromTomorrow = false): Date {
  const [h, m] = reminderTime.split(":").map(Number) as [number, number];
  const d = new Date();
  if (fromTomorrow) d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  if (!fromTomorrow && d <= new Date()) d.setDate(d.getDate() + 1);
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
            at: nextOccurrence(treatment.reminderTime, fromTomorrow),
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

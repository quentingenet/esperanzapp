import { registerPlugin } from "@capacitor/core";

export interface ExactAlarmPlugin {
  canScheduleExactAlarms(): Promise<{ value: boolean }>;
  requestExactAlarmPermission(): Promise<void>;
}

export const ExactAlarm = registerPlugin<ExactAlarmPlugin>("ExactAlarm", {
  web: () => ({
    canScheduleExactAlarms: async () => ({ value: true }),
    requestExactAlarmPermission: async () => {},
  }),
});

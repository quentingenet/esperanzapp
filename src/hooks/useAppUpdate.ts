import { useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AppUpdate, AppUpdateAvailability } from "@capawesome/capacitor-app-update";

export type UpdateCheckStatus = "idle" | "checking" | "available" | "up-to-date" | "error";

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateCheckStatus>("idle");

  const checkForUpdate = useCallback(async (): Promise<UpdateCheckStatus> => {
    if (!Capacitor.isNativePlatform()) return "up-to-date";
    setStatus("checking");
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      const result: UpdateCheckStatus =
        info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE
          ? "available"
          : "up-to-date";
      setStatus(result);
      return result;
    } catch {
      setStatus("error");
      return "error";
    }
  }, []);

  const openUpdate = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AppUpdate.performImmediateUpdate();
    } catch {
      await AppUpdate.openAppStore().catch(() => {});
    }
  }, []);

  return { status, checkForUpdate, openUpdate };
}

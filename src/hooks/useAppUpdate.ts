import { useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AppUpdate, AppUpdateAvailability } from "@capawesome/capacitor-app-update";

export type UpdateCheckStatus = "idle" | "checking" | "available" | "up-to-date" | "error";

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateCheckStatus>("idle");

  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    setStatus("checking");
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      const available = info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE;
      setStatus(available ? "available" : "up-to-date");
      return available;
    } catch {
      setStatus("error");
      return false;
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

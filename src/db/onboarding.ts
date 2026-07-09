import type { OnboardingKey } from "@/types";
import { withDb, withDbVoid } from "./client";
import { safeLocalStorageSet } from "@/utils/logger";

type OnboardingRow = {
  value: string;
};

export function getOnboardingValue(key: OnboardingKey): Promise<string | null> {
  return withDb(
    async (db) => {
      const result = await db.query("SELECT value FROM onboarding WHERE key = ?", [key]);
      const rows = (result.values ?? []) as OnboardingRow[];
      return rows[0]?.value ?? null;
    },
    localStorage.getItem(`onboarding_${key}`),
  );
}

export function setOnboardingValue(key: OnboardingKey, value: string): Promise<void> {
  return withDbVoid(
    async (db) => {
      await db.run(
        "INSERT INTO onboarding (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
        false,
      );
    },
    () => {
      safeLocalStorageSet(`onboarding_${key}`, value);
    },
  );
}

import { useCallback } from "react";
import { exportToJSON, exportToCSV, saveJSONToFolder, saveCSVToFolder, importFromJSON, importFromCSV } from "@/services";
import type { ShareOutcome, SaveOutcome } from "@/services/shareService";

export type { ShareOutcome, SaveOutcome };

export function useExport() {
  const exportJSON = useCallback(async (): Promise<ShareOutcome> => exportToJSON(), []);
  const exportCSV = useCallback(async (): Promise<ShareOutcome> => exportToCSV(), []);
  const saveJSON = useCallback(async (): Promise<SaveOutcome> => saveJSONToFolder(), []);
  const saveCSV = useCallback(async (): Promise<SaveOutcome> => saveCSVToFolder(), []);
  const importJSON = useCallback(async (file: File): Promise<void> => importFromJSON(file), []);
  const importCSV = useCallback(async (file: File): Promise<void> => importFromCSV(file), []);

  return { exportJSON, exportCSV, saveJSON, saveCSV, importJSON, importCSV };
}

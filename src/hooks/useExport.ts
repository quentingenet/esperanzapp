import { useCallback } from "react";
import { exportToJSON, exportToCSV, saveJSONToFolder, saveCSVToFolder, importFromJSON, importFromCSV } from "@/services";
import { peekIsEncrypted } from "@/utils/exportSerialization";
import type { ShareOutcome, SaveOutcome } from "@/services/shareService";

export type { ShareOutcome, SaveOutcome };

export function useExport() {
  const exportJSON = useCallback(async (password?: string): Promise<ShareOutcome> => exportToJSON(password), []);
  const exportCSV = useCallback(async (password?: string): Promise<ShareOutcome> => exportToCSV(password), []);
  const saveJSON = useCallback(async (password?: string): Promise<SaveOutcome> => saveJSONToFolder(password), []);
  const saveCSV = useCallback(async (password?: string): Promise<SaveOutcome> => saveCSVToFolder(password), []);
  const importJSON = useCallback(async (file: File, password?: string): Promise<void> => importFromJSON(file, password), []);
  const importCSV = useCallback(async (file: File, password?: string): Promise<void> => importFromCSV(file, password), []);
  const detectEncrypted = useCallback(async (file: File): Promise<boolean> => peekIsEncrypted(file), []);

  return { exportJSON, exportCSV, saveJSON, saveCSV, importJSON, importCSV, detectEncrypted };
}

import { useCallback } from "react";
import { exportToJSON, exportToCSV, saveJSONToFolder, saveCSVToFolder, importFromJSON, importFromCSV } from "@/services";

export function useExport() {
  const exportJSON = useCallback(async (): Promise<boolean> => {
    return exportToJSON();
  }, []);

  const exportCSV = useCallback(async (): Promise<boolean> => {
    return exportToCSV();
  }, []);

  const saveJSON = useCallback(async (): Promise<boolean> => {
    return saveJSONToFolder();
  }, []);

  const saveCSV = useCallback(async (): Promise<boolean> => {
    return saveCSVToFolder();
  }, []);

  const importJSON = useCallback(async (file: File): Promise<void> => {
    await importFromJSON(file);
  }, []);

  const importCSV = useCallback(async (file: File): Promise<void> => {
    await importFromCSV(file);
  }, []);

  return { exportJSON, exportCSV, saveJSON, saveCSV, importJSON, importCSV };
}

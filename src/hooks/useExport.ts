import { useCallback } from "react";
import { exportToJSON, exportToCSV, importFromJSON, importFromCSV } from "@/services";

export function useExport() {
  const exportJSON = useCallback(async (): Promise<boolean> => {
    return exportToJSON();
  }, []);

  const exportCSV = useCallback(async (): Promise<boolean> => {
    return exportToCSV();
  }, []);

  const importJSON = useCallback(async (file: File): Promise<void> => {
    await importFromJSON(file);
  }, []);

  const importCSV = useCallback(async (file: File): Promise<void> => {
    await importFromCSV(file);
  }, []);

  return { exportJSON, exportCSV, importJSON, importCSV };
}

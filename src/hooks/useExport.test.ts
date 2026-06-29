import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExport } from "./useExport";
import { exportToJSON, exportToCSV, importFromJSON, importFromCSV } from "@/services";

vi.mock("@/services", () => ({
  exportToJSON: vi.fn(),
  exportToCSV: vi.fn(),
  importFromJSON: vi.fn(),
  importFromCSV: vi.fn(),
}));

describe("useExport", () => {
  beforeEach(() => {
    vi.mocked(exportToJSON).mockResolvedValue(true);
    vi.mocked(exportToCSV).mockResolvedValue(true);
    vi.mocked(importFromJSON).mockResolvedValue(undefined);
    vi.mocked(importFromCSV).mockResolvedValue(undefined);
  });

  it("exportJSON calls exportToJSON", async () => {
    const { result } = renderHook(() => useExport());
    await act(async () => {
      await result.current.exportJSON();
    });
    expect(exportToJSON).toHaveBeenCalledTimes(1);
  });

  it("exportCSV calls exportToCSV", async () => {
    const { result } = renderHook(() => useExport());
    await act(async () => {
      await result.current.exportCSV();
    });
    expect(exportToCSV).toHaveBeenCalledTimes(1);
  });

  it("importJSON calls importFromJSON with the file", async () => {
    const file = new File(["{}"], "data.json", { type: "application/json" });
    const { result } = renderHook(() => useExport());
    await act(async () => {
      await result.current.importJSON(file);
    });
    expect(importFromJSON).toHaveBeenCalledWith(file);
  });

  it("importCSV calls importFromCSV with the file", async () => {
    const file = new File([""], "data.csv", { type: "text/csv" });
    const { result } = renderHook(() => useExport());
    await act(async () => {
      await result.current.importCSV(file);
    });
    expect(importFromCSV).toHaveBeenCalledWith(file);
  });
});

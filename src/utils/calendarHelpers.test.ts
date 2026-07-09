import { describe, it, expect } from "vitest";
import type { TreatmentLog } from "@/types";
import { buildTreatmentStatusMap } from "./calendarHelpers";

function makeTreatmentLog(
  id: string,
  treatmentId: string,
  scheduledAt: string,
  status: "taken" | "missed" | "pending",
): TreatmentLog {
  return { id, treatmentId, scheduledAt, status };
}

describe("buildTreatmentStatusMap", () => {
  it("returns empty map for no logs", () => {
    expect(buildTreatmentStatusMap([])).toEqual({});
  });

  it("maps scheduledAt to taken status using YYYY-MM-DD key", () => {
    const logs = [makeTreatmentLog("1", "1", "2024-01-01T08:00:00", "taken")];
    expect(buildTreatmentStatusMap(logs)).toEqual({ "2024-01-01": "taken" });
  });

  it("maps scheduledAt to missed status using YYYY-MM-DD key", () => {
    const logs = [makeTreatmentLog("1", "1", "2024-01-01T08:00:00", "missed")];
    expect(buildTreatmentStatusMap(logs)["2024-01-01"]).toBe("missed");
  });

  it("maps scheduledAt to pending status using YYYY-MM-DD key", () => {
    const logs = [makeTreatmentLog("1", "1", "2024-01-01T08:00:00", "pending")];
    expect(buildTreatmentStatusMap(logs)["2024-01-01"]).toBe("pending");
  });

  it("handles multiple logs on different dates", () => {
    const logs = [
      makeTreatmentLog("1", "1", "2024-01-01T08:00:00", "taken"),
      makeTreatmentLog("2", "1", "2024-01-02T08:00:00", "missed"),
      makeTreatmentLog("3", "1", "2024-01-03T08:00:00", "pending"),
    ];
    const map = buildTreatmentStatusMap(logs);
    expect(map["2024-01-01"]).toBe("taken");
    expect(map["2024-01-02"]).toBe("missed");
    expect(map["2024-01-03"]).toBe("pending");
  });

  it("last log wins when same date appears twice (normalized key)", () => {
    const logs = [
      makeTreatmentLog("1", "1", "2024-01-01T07:00:00", "pending"),
      makeTreatmentLog("2", "1", "2024-01-01T08:00:00", "taken"),
    ];
    expect(buildTreatmentStatusMap(logs)["2024-01-01"]).toBe("taken");
  });
});

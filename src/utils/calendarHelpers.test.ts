import { describe, it, expect } from "vitest";
import type { HabitLog, TreatmentLog } from "@/types";
import { buildDayStatusMap, buildTreatmentStatusMap } from "./calendarHelpers";

function makeHabitLog(
  id: string,
  habitId: string,
  eventType: "start" | "relapse",
  eventDate: string,
): HabitLog {
  return { id, habitId, eventType, eventDate };
}

function makeTreatmentLog(
  id: string,
  treatmentId: string,
  scheduledAt: string,
  status: "taken" | "missed" | "pending",
): TreatmentLog {
  return { id, treatmentId, scheduledAt, status };
}

describe("buildDayStatusMap", () => {
  it("returns empty map for no logs", () => {
    expect(buildDayStatusMap([], "2024-01-10")).toEqual({});
  });

  it("marks start date as 'start'", () => {
    const logs = [makeHabitLog("1", "1", "start", "2024-01-01")];
    const map = buildDayStatusMap(logs, "2024-01-01");
    expect(map["2024-01-01"]).toBe("start");
  });

  it("marks relapse date as 'relapse'", () => {
    const logs = [
      makeHabitLog("1", "1", "start", "2024-01-01"),
      makeHabitLog("2", "1", "relapse", "2024-01-05"),
    ];
    const map = buildDayStatusMap(logs, "2024-01-10");
    expect(map["2024-01-05"]).toBe("relapse");
  });

  it("fills active days between start and relapse", () => {
    const logs = [
      makeHabitLog("1", "1", "start", "2024-01-01"),
      makeHabitLog("2", "1", "relapse", "2024-01-05"),
    ];
    const map = buildDayStatusMap(logs, "2024-01-10");
    expect(map["2024-01-02"]).toBe("active");
    expect(map["2024-01-03"]).toBe("active");
    expect(map["2024-01-04"]).toBe("active");
  });

  it("does not fill active days between relapse and next start", () => {
    const logs = [
      makeHabitLog("1", "1", "start", "2024-01-01"),
      makeHabitLog("2", "1", "relapse", "2024-01-05"),
      makeHabitLog("3", "1", "start", "2024-01-08"),
    ];
    const map = buildDayStatusMap(logs, "2024-01-10");
    expect(map["2024-01-06"]).toBeUndefined();
    expect(map["2024-01-07"]).toBeUndefined();
  });

  it("fills active days from second start to today", () => {
    const logs = [
      makeHabitLog("1", "1", "start", "2024-01-01"),
      makeHabitLog("2", "1", "relapse", "2024-01-05"),
      makeHabitLog("3", "1", "start", "2024-01-08"),
    ];
    const map = buildDayStatusMap(logs, "2024-01-10");
    expect(map["2024-01-09"]).toBe("active");
    expect(map["2024-01-10"]).toBe("active");
  });

  it("does not mark days after today as active", () => {
    const logs = [makeHabitLog("1", "1", "start", "2024-01-01")];
    const map = buildDayStatusMap(logs, "2024-01-03");
    expect(map["2024-01-04"]).toBeUndefined();
  });

  it("handles unsorted logs correctly", () => {
    const logs = [
      makeHabitLog("2", "1", "relapse", "2024-01-05"),
      makeHabitLog("1", "1", "start", "2024-01-01"),
    ];
    const map = buildDayStatusMap(logs, "2024-01-10");
    expect(map["2024-01-01"]).toBe("start");
    expect(map["2024-01-05"]).toBe("relapse");
    expect(map["2024-01-02"]).toBe("active");
  });

  it("handles single day start with today = start date", () => {
    const logs = [makeHabitLog("1", "1", "start", "2024-06-01")];
    const map = buildDayStatusMap(logs, "2024-06-01");
    expect(map["2024-06-01"]).toBe("start");
    expect(map["2024-06-02"]).toBeUndefined();
  });

  it("handles consecutive start + relapse on adjacent days", () => {
    const logs = [
      makeHabitLog("1", "1", "start", "2024-01-01"),
      makeHabitLog("2", "1", "relapse", "2024-01-02"),
    ];
    const map = buildDayStatusMap(logs, "2024-01-05");
    expect(map["2024-01-01"]).toBe("start");
    expect(map["2024-01-02"]).toBe("relapse");
    expect(map["2024-01-03"]).toBeUndefined();
  });
});

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

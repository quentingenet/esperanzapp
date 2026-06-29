import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import type { Habit, HabitLog, Treatment, TreatmentLog } from "@/types";
import {
  buildExportPayload,
  parseExportPayload,
  payloadToCSV,
  parseCSVPayload,
} from "./exportSerialization";
import {
  exportToJSON,
  exportToCSV,
  importFromJSON,
  importFromCSV,
} from "../services/exportService";

vi.mock("@/db", () => ({
  getAllHabits: vi.fn().mockResolvedValue([]),
  getAllHabitLogs: vi.fn().mockResolvedValue([]),
  getAllTreatments: vi.fn().mockResolvedValue([]),
  getAllTreatmentLogs: vi.fn().mockResolvedValue([]),
  createHabit: vi.fn().mockResolvedValue({ id: "10" }),
  createHabitLog: vi.fn().mockResolvedValue({ id: "20" }),
  createTreatment: vi.fn().mockResolvedValue({ id: "30" }),
  createTreatmentLog: vi.fn().mockResolvedValue({ id: "40" }),
}));

const mockHabit: Habit = {
  id: "1",
  label: "Alcohol",
  icon: "drink",
  color: "#3a8fd1",
  bgColor: "#e8f4fd",
  startDate: "2024-01-01",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockHabitLog: HabitLog = {
  id: "1",
  habitId: "1",
  eventType: "start",
  eventDate: "2024-01-01",
};

const mockTreatment: Treatment = {
  id: "1",
  label: "Metformin",
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockTreatmentLog: TreatmentLog = {
  id: "1",
  treatmentId: "1",
  scheduledAt: "2024-01-01T08:00:00",
  status: "taken",
};

describe("buildExportPayload", () => {
  it("builds payload with correct structure", () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [mockTreatment],
      [mockTreatmentLog],
      "2024-01-01T00:00:00.000Z",
    );
    expect(payload.version).toBe("1");
    expect(payload.exportedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(payload.habits).toHaveLength(1);
    expect(payload.habitLogs).toHaveLength(1);
    expect(payload.treatments).toHaveLength(1);
    expect(payload.treatmentLogs).toHaveLength(1);
  });

  it("builds payload with empty arrays", () => {
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    expect(payload.habits).toEqual([]);
    expect(payload.habitLogs).toEqual([]);
    expect(payload.treatments).toEqual([]);
    expect(payload.treatmentLogs).toEqual([]);
  });
});

describe("parseExportPayload", () => {
  it("parses valid JSON payload", () => {
    const payload = buildExportPayload(
      [mockHabit],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const parsed = parseExportPayload(JSON.stringify(payload));
    expect(parsed.version).toBe("1");
    expect(parsed.habits[0]?.label).toBe("Alcohol");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseExportPayload("not json")).toThrow();
  });

  it("throws on wrong version", () => {
    const bad = JSON.stringify({ version: "99", exportedAt: "", habits: [], habitLogs: [], treatments: [], treatmentLogs: [] });
    expect(() => parseExportPayload(bad)).toThrow("Unsupported or invalid export format");
  });

  it("throws when version is missing", () => {
    const bad = JSON.stringify({ exportedAt: "", habits: [] });
    expect(() => parseExportPayload(bad)).toThrow();
  });

  it("throws on null input", () => {
    expect(() => parseExportPayload("null")).toThrow();
  });
});

describe("payloadToCSV", () => {
  it("includes section headers", () => {
    const payload = buildExportPayload([mockHabit], [mockHabitLog], [mockTreatment], [mockTreatmentLog], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    expect(csv).toContain("HABITS");
    expect(csv).toContain("HABIT_LOGS");
    expect(csv).toContain("TREATMENTS");
    expect(csv).toContain("TREATMENT_LOGS");
  });

  it("includes column headers", () => {
    const payload = buildExportPayload([mockHabit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    expect(csv).toContain("id,label,icon,color,bgColor,startDate,createdAt");
  });

  it("includes habit data", () => {
    const payload = buildExportPayload([mockHabit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    expect(csv).toContain("Alcohol");
  });

  it("escapes fields containing commas", () => {
    const habit = { ...mockHabit, label: "Sugar, refined" };
    const payload = buildExportPayload([habit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    expect(csv).toContain('"Sugar, refined"');
  });

  it("escapes fields containing quotes", () => {
    const habit = { ...mockHabit, label: 'He said "stop"' };
    const payload = buildExportPayload([habit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    expect(csv).toContain('"He said ""stop"""');
  });

  it("produces empty data rows for empty arrays", () => {
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    expect(csv).toContain("HABITS");
  });
});

describe("parseCSVPayload", () => {
  it("round-trips a full payload", () => {
    const original = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [mockTreatment],
      [mockTreatmentLog],
      "2024-01-01T00:00:00.000Z",
    );
    const csv = payloadToCSV(original);
    const parsed = parseCSVPayload(csv);
    expect(parsed.habits[0]?.label).toBe("Alcohol");
    expect(parsed.habitLogs[0]?.eventType).toBe("start");
    expect(parsed.treatments[0]?.frequency).toBe("daily");
    expect(parsed.treatments[0]?.reminderEnabled).toBe(true);
    expect(parsed.treatmentLogs[0]?.status).toBe("taken");
  });

  it("round-trips reminderEnabled=false as '0'", () => {
    const treatmentNoReminder: Treatment = { ...mockTreatment, reminderEnabled: false };
    const payload = buildExportPayload([], [], [treatmentNoReminder], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    expect(csv).toContain(",0,");
    const parsed = parseCSVPayload(csv);
    expect(parsed.treatments[0]?.reminderEnabled).toBe(false);
  });

  it("returns empty arrays when sections are missing", () => {
    const parsed = parseCSVPayload("HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n");
    expect(parsed.habitLogs).toEqual([]);
    expect(parsed.treatments).toEqual([]);
  });

  it("ignores rows with wrong column count", () => {
    const csv = "HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n1,OnlyTwoFields\n";
    const parsed = parseCSVPayload(csv);
    expect(parsed.habits).toHaveLength(0);
  });
});

describe("exportToJSON", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });
  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("calls Filesystem.writeFile with .json path", async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    await exportToJSON();
    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringMatching(/^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/) }),
    );
  });

  it("writes valid JSON content", async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    await exportToJSON();
    const call = (Filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][0] as { data: string };
    const parsed: unknown = JSON.parse(call.data);
    expect(parsed).toHaveProperty("version", "1");
  });
});

describe("exportToCSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });
  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("calls Filesystem.writeFile with .csv path", async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    await exportToCSV();
    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringMatching(/^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/) }),
    );
  });

  it("writes content containing HABITS section", async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    await exportToCSV();
    const call = (Filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][0] as { data: string };
    expect(call.data).toContain("HABITS");
  });
});

describe("importFromJSON", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports habits and maps IDs for habit logs", async () => {
    const { createHabit, createHabitLog } = await import("@/db");
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(createHabit).toHaveBeenCalledTimes(1);
    expect(createHabitLog).toHaveBeenCalledWith(
      expect.objectContaining({ habitId: "10" }),
    );
  });

  it("imports treatments and maps IDs for treatment logs", async () => {
    const { createTreatment, createTreatmentLog } = await import("@/db");
    const payload = buildExportPayload(
      [],
      [],
      [mockTreatment],
      [mockTreatmentLog],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(createTreatment).toHaveBeenCalledTimes(1);
    expect(createTreatmentLog).toHaveBeenCalledWith(
      expect.objectContaining({ treatmentId: "30" }),
    );
  });

  it("skips habit logs with unknown habitId", async () => {
    const { createHabitLog } = await import("@/db");
    const orphanLog: HabitLog = { ...mockHabitLog, habitId: "999" };
    const payload = buildExportPayload([mockHabit], [orphanLog], [], [], "2024-01-01T00:00:00.000Z");
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(createHabitLog).not.toHaveBeenCalled();
  });

  it("throws on invalid JSON file", async () => {
    const file = new File(["not valid json"], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toThrow();
  });

  it("handles empty payload gracefully", async () => {
    const { createHabit } = await import("@/db");
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(createHabit).not.toHaveBeenCalled();
  });
});

describe("importFromCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports habits from CSV", async () => {
    const { createHabit } = await import("@/db");
    const payload = buildExportPayload([mockHabit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    const file = new File([csv], "export.csv", { type: "text/csv" });
    await importFromCSV(file);
    expect(createHabit).toHaveBeenCalledTimes(1);
  });

  it("maps habit IDs in habit logs from CSV", async () => {
    const { createHabitLog } = await import("@/db");
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const csv = payloadToCSV(payload);
    const file = new File([csv], "export.csv", { type: "text/csv" });
    await importFromCSV(file);
    expect(createHabitLog).toHaveBeenCalledWith(
      expect.objectContaining({ habitId: "10" }),
    );
  });

  it("handles empty CSV gracefully", async () => {
    const { createHabit } = await import("@/db");
    const file = new File([""], "export.csv", { type: "text/csv" });
    await importFromCSV(file);
    expect(createHabit).not.toHaveBeenCalled();
  });
});

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
  saveJSONToFolder,
  saveCSVToFolder,
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
  runInTransaction: vi.fn().mockImplementation(async (fn: (db: null) => Promise<void>) => fn(null)),
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
  reminderDay: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockTreatmentLog: TreatmentLog = {
  id: "1",
  treatmentId: "1",
  scheduledAt: "2024-01-01",
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

  it("throws when required arrays are missing", () => {
    const bad = JSON.stringify({ version: "1", exportedAt: "2024-01-01T00:00:00.000Z" });
    expect(() => parseExportPayload(bad)).toThrow("Unsupported or invalid export format");
  });

  it("throws when habits array is missing", () => {
    const bad = JSON.stringify({ version: "1", exportedAt: "", habitLogs: [], treatments: [], treatmentLogs: [] });
    expect(() => parseExportPayload(bad)).toThrow("Unsupported or invalid export format");
  });

  it("throws when habit has invalid hex color", () => {
    const bad = JSON.stringify({
      version: "1", exportedAt: "", habitLogs: [], treatments: [], treatmentLogs: [],
      habits: [{ ...mockHabit, color: "notahex" }],
    });
    expect(() => parseExportPayload(bad)).toThrow("habits: color must be a hex color");
  });

  it("throws when habit has invalid createdAt", () => {
    const bad = JSON.stringify({
      version: "1", exportedAt: "", habitLogs: [], treatments: [], treatmentLogs: [],
      habits: [{ ...mockHabit, createdAt: "not-a-datetime" }],
    });
    expect(() => parseExportPayload(bad)).toThrow("habits: createdAt must be a valid date-time");
  });

  it("throws when daily treatment has non-null reminderDay", () => {
    const bad = JSON.stringify({
      version: "1", exportedAt: "", habits: [], habitLogs: [], treatmentLogs: [],
      treatments: [{ ...mockTreatment, frequency: "daily", reminderDay: 3 }],
    });
    expect(() => parseExportPayload(bad)).toThrow("treatments: daily frequency must have null reminderDay");
  });

  it("throws when weekly treatment has out-of-range reminderDay", () => {
    const bad = JSON.stringify({
      version: "1", exportedAt: "", habits: [], habitLogs: [], treatmentLogs: [],
      treatments: [{ ...mockTreatment, frequency: "weekly", reminderDay: 8 }],
    });
    expect(() => parseExportPayload(bad)).toThrow("treatments: weekly frequency must have reminderDay 0-6");
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

  it("throws when one or more sections are missing from the CSV", () => {
    expect(() =>
      parseCSVPayload("HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n"),
    ).toThrow(/CSV missing required section/);
  });

  it("throws on non-empty content with no recognised section headers", () => {
    expect(() => parseCSVPayload("name,email\njohn,doe")).toThrow("Unsupported or invalid CSV format");
  });

  it("throws on empty file", () => {
    expect(() => parseCSVPayload("")).toThrow("Empty CSV file");
  });

  it("throws on row with wrong column count", () => {
    const csv = "HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n1,OnlyTwoFields\n";
    expect(() => parseCSVPayload(csv)).toThrow();
  });

  // Helpers: section headers used to satisfy the "all 4 required" validation
  const H = "HABITS\nid,label,icon,color,bgColor,startDate,createdAt";
  const HL = "HABIT_LOGS\nid,habitId,eventType,eventDate";
  const TR = "TREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt";
  const TL = "TREATMENT_LOGS\nid,treatmentId,scheduledAt,status";

  it("throws on invalid startDate in HABITS", () => {
    const csv = `HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n1,Alcool,icon,#3a8fd1,#e8f4fd,not-a-date,2024-01-01T00:00:00Z\n\n${HL}\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow("habits: startDate must be YYYY-MM-DD");
  });

  it("throws when HABITS columns are renamed", () => {
    const csv = `HABITS\nidentifier,label,icon,color,bgColor,startDate,createdAt\n\n${HL}\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(/CSV section HABITS: expected columns/);
  });

  it("throws when HABITS columns are in wrong order", () => {
    const csv = `HABITS\nlabel,id,icon,color,bgColor,startDate,createdAt\n\n${HL}\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(/CSV section HABITS: expected columns/);
  });

  it("throws when HABITS has extra columns", () => {
    const csv = `HABITS\nid,label,icon,color,bgColor,startDate,createdAt,extra\n\n${HL}\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(/CSV section HABITS: expected columns/);
  });

  it("throws when HABIT_LOGS columns are renamed", () => {
    const csv = `${H}\n\nHABIT_LOGS\nidentifier,habitId,eventType,eventDate\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(/CSV section HABIT_LOGS: expected columns/);
  });

  it("throws on invalid hex color in HABITS", () => {
    const csv = `HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n1,Alcool,icon,notahex,#e8f4fd,2024-01-01,2024-01-01T00:00:00Z\n\n${HL}\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow("habits: color must be a hex color");
  });

  it("throws on invalid createdAt in HABITS", () => {
    const csv = `HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n1,Alcool,icon,#3a8fd1,#e8f4fd,2024-01-01,not-a-datetime\n\n${HL}\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow("habits: createdAt must be a valid date-time");
  });

  it("throws on daily treatment with non-null reminderDay", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,daily,08:00,1,3,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow("treatments: daily frequency must have null reminderDay");
  });

  it("throws on weekly treatment with out-of-range reminderDay", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,weekly,08:00,1,8,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow("treatments: weekly frequency must have reminderDay 0-6");
  });

  it("throws on invalid eventType in HABIT_LOGS", () => {
    const csv = `${H}\n\nHABIT_LOGS\nid,habitId,eventType,eventDate\n1,1,unknown,2024-01-01\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow();
  });

  it("throws on invalid eventDate in HABIT_LOGS", () => {
    const csv = `${H}\n\nHABIT_LOGS\nid,habitId,eventType,eventDate\n1,1,start,not-a-date\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow();
  });

  it("throws on invalid frequency in TREATMENTS", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,quarterly,08:00,1,,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow();
  });

  it("throws on invalid reminderTime in TREATMENTS", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,daily,25:99,1,,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow();
  });

  it("throws on invalid reminderEnabled value in TREATMENTS", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,daily,08:00,true,,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(/reminderEnabled must be "0" or "1"/);
  });

  it("throws on invalid status in TREATMENT_LOGS", () => {
    const csv = `${H}\n\n${HL}\n\n${TR}\n\nTREATMENT_LOGS\nid,treatmentId,scheduledAt,status\n1,1,2024-01-01,unknown\n`;
    expect(() => parseCSVPayload(csv)).toThrow();
  });

  it("throws on invalid scheduledAt in TREATMENT_LOGS", () => {
    const csv = `${H}\n\n${HL}\n\n${TR}\n\nTREATMENT_LOGS\nid,treatmentId,scheduledAt,status\n1,1,not-a-date,taken\n`;
    expect(() => parseCSVPayload(csv)).toThrow();
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
    const call = (Filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { data: string };
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
    const call = (Filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { data: string };
    expect(call.data).toContain("HABITS");
  });
});

describe("saveJSONToFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });
  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("calls Filesystem.writeFile with Documents directory and .json path", async () => {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    await saveJSONToFolder();
    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/),
        directory: Directory.Documents,
      }),
    );
  });

  it("does not call Share.share", async () => {
    const { Share } = await import("@capacitor/share");
    await saveJSONToFolder();
    expect(Share.share).not.toHaveBeenCalled();
  });
});

describe("saveCSVToFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });
  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("calls Filesystem.writeFile with Documents directory and .csv path", async () => {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    await saveCSVToFolder();
    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/),
        directory: Directory.Documents,
      }),
    );
  });

  it("does not call Share.share", async () => {
    const { Share } = await import("@capacitor/share");
    await saveCSVToFolder();
    expect(Share.share).not.toHaveBeenCalled();
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
      null,
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
      null,
    );
  });

  it("throws on orphan habitLog referencing unknown habitId", async () => {
    const orphanLog: HabitLog = { ...mockHabitLog, habitId: "999" };
    const payload = buildExportPayload([mockHabit], [orphanLog], [], [], "2024-01-01T00:00:00.000Z");
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toThrow(/references unknown habitId/);
  });

  it("throws on orphan treatmentLog referencing unknown treatmentId", async () => {
    const orphanLog: TreatmentLog = { ...mockTreatmentLog, treatmentId: "999" };
    const payload = buildExportPayload([], [], [mockTreatment], [orphanLog], "2024-01-01T00:00:00.000Z");
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toThrow(/references unknown treatmentId/);
  });

  it("throws on invalid JSON file", async () => {
    const file = new File(["not valid json"], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toThrow();
  });

  it("throws when JSON has missing required arrays", async () => {
    const bad = JSON.stringify({ version: "1", exportedAt: "2024-01-01T00:00:00.000Z" });
    const file = new File([bad], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toThrow("Unsupported or invalid export format");
  });

  it("throws when JSON version is wrong", async () => {
    const bad = JSON.stringify({ version: "99", habits: [], habitLogs: [], treatments: [], treatmentLogs: [] });
    const file = new File([bad], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toThrow("Unsupported or invalid export format");
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
      null,
    );
  });

  it("throws on empty CSV file", async () => {
    const file = new File([""], "export.csv", { type: "text/csv" });
    await expect(importFromCSV(file)).rejects.toThrow("Empty CSV file");
  });

  it("throws on CSV with no recognised section headers", async () => {
    const file = new File(["name,email\njohn,doe"], "bad.csv", { type: "text/csv" });
    await expect(importFromCSV(file)).rejects.toThrow("Unsupported or invalid CSV format");
  });
});

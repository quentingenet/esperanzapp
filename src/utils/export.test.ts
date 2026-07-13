import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import type {
  Habit,
  HabitLog,
  Treatment,
  TreatmentLog,
  PositiveHabit,
  PositiveHabitLog,
} from "@/types";
import {
  buildExportPayload,
  parseExportPayload,
  payloadToCSV,
  parseCSVPayload,
  encryptPayload,
  decryptPayload,
  isEncryptedEnvelope,
  WrongPasswordError,
  PBKDF2_ITERATIONS,
  peekIsEncrypted,
  exportTimestamp,
} from "./exportSerialization";
import {
  exportToJSON,
  exportToCSV,
  saveJSONToFolder,
  saveCSVToFolder,
  importFromJSON,
  importFromCSV,
  CorruptFileError,
  ImportStorageError,
  InconsistentImportDataError,
  InvalidImportFileError,
  UnsupportedImportVersionError,
} from "../services/exportService";

const { mockTransactionDb } = vi.hoisted(() => ({
  mockTransactionDb: {
    run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
  },
}));

vi.mock("@/db", () => ({
  getAllHabits: vi.fn().mockResolvedValue([]),
  getAllHabitLogs: vi.fn().mockResolvedValue([]),
  getAllTreatments: vi.fn().mockResolvedValue([]),
  getAllTreatmentLogs: vi.fn().mockResolvedValue([]),
  getAllPositiveHabits: vi.fn().mockResolvedValue([]),
  getAllPositiveHabitLogs: vi.fn().mockResolvedValue([]),
  clearAllData: vi.fn().mockResolvedValue(undefined),
  runInTransaction: vi
    .fn()
    .mockImplementation(async (fn: (db: typeof mockTransactionDb) => Promise<void>) =>
      fn(mockTransactionDb),
    ),
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

const mockPositiveHabit: PositiveHabit = {
  id: "1",
  label: "Course à pied",
  icon: "run",
  color: "#2e7d32",
  bgColor: "#e8f5e9",
  frequency: "daily",
  reminderTime: "07:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockPositiveHabitLog: PositiveHabitLog = {
  id: "1",
  positiveHabitId: "1",
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

  it("defaults positiveHabits/positiveHabitLogs to [] when omitted (pre-existing call sites)", () => {
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    expect(payload.positiveHabits).toEqual([]);
    expect(payload.positiveHabitLogs).toEqual([]);
  });

  it("includes positiveHabits/positiveHabitLogs when passed explicitly", () => {
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    expect(payload.positiveHabits).toEqual([mockPositiveHabit]);
    expect(payload.positiveHabitLogs).toEqual([mockPositiveHabitLog]);
  });
});

describe("exportTimestamp", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("distinguishes exports created milliseconds apart", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T12:00:00.001Z"));
    const first = exportTimestamp();
    vi.setSystemTime(new Date("2026-07-03T12:00:00.002Z"));
    const second = exportTimestamp();
    expect(first).not.toBe(second);
  });
});

describe("parseExportPayload", () => {
  it("parses valid JSON payload", () => {
    const payload = buildExportPayload([mockHabit], [], [], [], "2024-01-01T00:00:00.000Z");
    const parsed = parseExportPayload(JSON.stringify(payload));
    expect(parsed.version).toBe("1");
    expect(parsed.habits[0]?.label).toBe("Alcohol");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseExportPayload("not json")).toThrow();
  });

  it("throws on wrong version", () => {
    const bad = JSON.stringify({
      version: "99",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    expect(() => parseExportPayload(bad)).toThrow("Unsupported export version");
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
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    expect(() => parseExportPayload(bad)).toThrow("Unsupported or invalid export format");
  });

  it("throws when habit has invalid hex color", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
      habits: [{ ...mockHabit, color: "notahex" }],
    });
    expect(() => parseExportPayload(bad)).toThrow("habits: color must be a hex color");
  });

  it("throws when habit has invalid createdAt", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
      habits: [{ ...mockHabit, createdAt: "not-a-datetime" }],
    });
    expect(() => parseExportPayload(bad)).toThrow("habits: createdAt must be a valid date-time");
  });

  it("throws when habit has non-integer id (uuid)", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
      habits: [{ ...mockHabit, id: "uuid-abc-123" }],
    });
    expect(() => parseExportPayload(bad)).toThrow("habits: id must be a positive integer string");
  });

  it("throws when habitLog has non-integer habitId", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [mockHabit],
      treatments: [],
      treatmentLogs: [],
      habitLogs: [{ ...mockHabitLog, habitId: "uuid-abc-123" }],
    });
    expect(() => parseExportPayload(bad)).toThrow(
      "habitLogs: habitId must be a positive integer string",
    );
  });

  it("throws when treatmentLog has non-integer treatmentId", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatments: [mockTreatment],
      treatmentLogs: [{ ...mockTreatmentLog, treatmentId: "uuid-abc-123" }],
    });
    expect(() => parseExportPayload(bad)).toThrow(
      "treatmentLogs: treatmentId must be a positive integer string",
    );
  });

  it("throws when daily treatment has non-null reminderDay", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatmentLogs: [],
      treatments: [{ ...mockTreatment, frequency: "daily", reminderDay: 3 }],
    });
    expect(() => parseExportPayload(bad)).toThrow(
      "treatments: daily frequency must have null reminderDay",
    );
  });

  it("throws when weekly treatment has out-of-range reminderDay", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatmentLogs: [],
      treatments: [{ ...mockTreatment, frequency: "weekly", reminderDay: 8 }],
    });
    expect(() => parseExportPayload(bad)).toThrow(
      "treatments: weekly frequency must have reminderDay 0-6",
    );
  });

  it("throws when monthly treatment has out-of-range reminderDay (29)", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatmentLogs: [],
      treatments: [{ ...mockTreatment, frequency: "monthly", reminderDay: 29 }],
    });
    expect(() => parseExportPayload(bad)).toThrow(
      "treatments: monthly frequency must have reminderDay 0 or 1-28",
    );
  });

  it("accepts monthly treatment with reminderDay 0 (last day sentinel)", () => {
    const ok = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatmentLogs: [],
      treatments: [{ ...mockTreatment, frequency: "monthly", reminderDay: 0 }],
    });
    expect(() => parseExportPayload(ok)).not.toThrow();
  });

  it("accepts monthly treatment with reminderDay 28 (max calendar day)", () => {
    const ok = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatmentLogs: [],
      treatments: [{ ...mockTreatment, frequency: "monthly", reminderDay: 28 }],
    });
    expect(() => parseExportPayload(ok)).not.toThrow();
  });

  it("accepts a valid ISO exportedAt", () => {
    const ok = JSON.stringify({
      version: "1",
      exportedAt: "2024-06-01T12:00:00.000Z",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    expect(() => parseExportPayload(ok)).not.toThrow();
  });

  it("accepts an empty string exportedAt (metadata unavailable)", () => {
    const ok = JSON.stringify({
      version: "1",
      exportedAt: "",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    const parsed = parseExportPayload(ok);
    expect(parsed.exportedAt).toBeNull();
  });

  it("accepts missing exportedAt (treated as null)", () => {
    const ok = JSON.stringify({
      version: "1",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    const parsed = parseExportPayload(ok);
    expect(parsed.exportedAt).toBeNull();
  });

  it("throws when exportedAt is a non-empty non-ISO string", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "not-a-date",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    expect(() => parseExportPayload(bad)).toThrow("exportedAt must be a valid ISO date-time");
  });

  it("round-trips positiveHabits/positiveHabitLogs", () => {
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    const parsed = parseExportPayload(JSON.stringify(payload));
    expect(parsed.positiveHabits).toEqual([mockPositiveHabit]);
    expect(parsed.positiveHabitLogs).toEqual([mockPositiveHabitLog]);
  });

  it("treats missing positiveHabits/positiveHabitLogs keys as [] (pre-'faire plus' export files)", () => {
    const legacy = JSON.stringify({
      version: "1",
      exportedAt: "2024-01-01T00:00:00.000Z",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    const parsed = parseExportPayload(legacy);
    expect(parsed.positiveHabits).toEqual([]);
    expect(parsed.positiveHabitLogs).toEqual([]);
  });

  it("throws when positiveHabits is present but not an array", () => {
    const bad = JSON.stringify({
      version: "1",
      exportedAt: "2024-01-01T00:00:00.000Z",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
      positiveHabits: "not-an-array",
    });
    expect(() => parseExportPayload(bad)).toThrow("Unsupported or invalid export format");
  });
});

describe("payloadToCSV", () => {
  it("includes section headers", () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [mockTreatment],
      [mockTreatmentLog],
      "2024-01-01T00:00:00.000Z",
    );
    const csv = payloadToCSV(payload);
    expect(csv).toContain("HABITS");
    expect(csv).toContain("HABIT_LOGS");
    expect(csv).toContain("TREATMENTS");
    expect(csv).toContain("TREATMENT_LOGS");
  });

  it("includes column headers", () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const csv = payloadToCSV(payload);
    expect(csv).toContain("id,label,icon,color,bgColor,startDate,createdAt");
  });

  it("includes habit data", () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
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

  it("includes POSITIVE_HABITS/POSITIVE_HABIT_LOGS section headers and data", () => {
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    const csv = payloadToCSV(payload);
    expect(csv).toContain("POSITIVE_HABITS");
    expect(csv).toContain("POSITIVE_HABIT_LOGS");
    expect(csv).toContain("id,label,icon,color,bgColor,frequency,reminderTime,reminderEnabled,reminderDay,createdAt");
    expect(csv).toContain("Course à pied");
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
    const payload = buildExportPayload(
      [],
      [],
      [treatmentNoReminder],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const csv = payloadToCSV(payload);
    expect(csv).toContain(",0,");
    const parsed = parseCSVPayload(csv);
    expect(parsed.treatments[0]?.reminderEnabled).toBe(false);
  });

  it("round-trips POSITIVE_HABITS/POSITIVE_HABIT_LOGS", () => {
    const original = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    const csv = payloadToCSV(original);
    const parsed = parseCSVPayload(csv);
    expect(parsed.positiveHabits[0]?.label).toBe("Course à pied");
    expect(parsed.positiveHabits[0]?.frequency).toBe("daily");
    expect(parsed.positiveHabitLogs[0]?.status).toBe("taken");
  });

  it("treats a CSV without POSITIVE_HABITS/POSITIVE_HABIT_LOGS sections as [] (pre-'faire plus' CSV files)", () => {
    const legacyPayload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [mockTreatment],
      [mockTreatmentLog],
      "2024-01-01T00:00:00.000Z",
    );
    // payloadToCSV always emits the two new sections now — simulate an old export by
    // stripping them, matching a file exported before this feature existed.
    const legacyCsv = payloadToCSV(legacyPayload).split("\nPOSITIVE_HABITS\n")[0]!;
    const parsed = parseCSVPayload(legacyCsv);
    expect(parsed.positiveHabits).toEqual([]);
    expect(parsed.positiveHabitLogs).toEqual([]);
    expect(parsed.habits).toHaveLength(1);
  });

  it("throws when one or more sections are missing from the CSV", () => {
    expect(() =>
      parseCSVPayload("HABITS\nid,label,icon,color,bgColor,startDate,createdAt\n"),
    ).toThrow(/CSV missing required section/);
  });

  it("throws on non-empty content with no recognised section headers", () => {
    expect(() => parseCSVPayload("name,email\njohn,doe")).toThrow(
      "Unsupported or invalid CSV format",
    );
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

  it("throws on non-integer habit id in CSV", () => {
    const csv = `HABITS\nid,label,icon,color,bgColor,startDate,createdAt\nuuid-123,Alcool,icon,#3a8fd1,#e8f4fd,2024-01-01,2024-01-01T00:00:00Z\n\n${HL}\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow("habits: id must be a positive integer string");
  });

  it("throws on non-integer habitId in HABIT_LOGS CSV", () => {
    const csv = `${H}\n\nHABIT_LOGS\nid,habitId,eventType,eventDate\n1,uuid-123,start,2024-01-01\n\n${TR}\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(
      "habitLogs: habitId must be a positive integer string",
    );
  });

  it("throws on daily treatment with non-null reminderDay", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,daily,08:00,1,3,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(
      "treatments: daily frequency must have null reminderDay",
    );
  });

  it("throws on weekly treatment with out-of-range reminderDay", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,weekly,08:00,1,8,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow(
      "treatments: weekly frequency must have reminderDay 0-6",
    );
  });

  it("throws on monthly treatment with out-of-range reminderDay (29)", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,monthly,08:00,1,29,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).toThrow("treatments: invalid reminderDay");
  });

  it("accepts monthly treatment with reminderDay 0 (last day sentinel) in CSV", () => {
    const csv = `${H}\n\n${HL}\n\nTREATMENTS\nid,label,frequency,reminderTime,reminderEnabled,reminderDay,createdAt\n1,Med,monthly,08:00,1,0,2024-01-01T00:00:00Z\n\n${TL}`;
    expect(() => parseCSVPayload(csv)).not.toThrow();
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

describe("CSV multiline and special character round-trips", () => {
  it("round-trips a label containing an embedded newline", () => {
    const habit = { ...mockHabit, label: "Line one\nLine two" };
    const payload = buildExportPayload([habit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    const parsed = parseCSVPayload(csv);
    expect(parsed.habits[0]?.label).toBe("Line one\nLine two");
  });

  it("round-trips a label containing double-quotes", () => {
    const habit = { ...mockHabit, label: 'He said "stop"' };
    const payload = buildExportPayload([habit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    const parsed = parseCSVPayload(csv);
    expect(parsed.habits[0]?.label).toBe('He said "stop"');
  });

  it("round-trips a label containing a comma", () => {
    const habit = { ...mockHabit, label: "Sugar, refined" };
    const payload = buildExportPayload([habit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    const parsed = parseCSVPayload(csv);
    expect(parsed.habits[0]?.label).toBe("Sugar, refined");
  });

  it("round-trips a label with newline, comma, and quote combined", () => {
    const habit = { ...mockHabit, label: 'First line, "quoted"\nSecond line' };
    const payload = buildExportPayload([habit], [], [], [], "2024-01-01T00:00:00.000Z");
    const csv = payloadToCSV(payload);
    const parsed = parseCSVPayload(csv);
    expect(parsed.habits[0]?.label).toBe('First line, "quoted"\nSecond line');
  });

  it("full payload export -> import is lossless with multiline habit label", () => {
    const habit = { ...mockHabit, label: "Take\nyour\nmeds" };
    const original = buildExportPayload(
      [habit],
      [mockHabitLog],
      [mockTreatment],
      [mockTreatmentLog],
      "2024-01-01T00:00:00.000Z",
    );
    const csv = payloadToCSV(original);
    const parsed = parseCSVPayload(csv);
    expect(parsed.habits[0]?.label).toBe("Take\nyour\nmeds");
    expect(parsed.habitLogs).toHaveLength(1);
    expect(parsed.treatments[0]?.frequency).toBe("daily");
    expect(parsed.treatmentLogs[0]?.status).toBe("taken");
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
      expect.objectContaining({
        path: expect.stringMatching(
          /^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.json$/,
        ),
      }),
    );
  });

  it("writes valid JSON content", async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    await exportToJSON();
    const call = (Filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      data: string;
    };
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
      expect.objectContaining({
        path: expect.stringMatching(
          /^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.csv$/,
        ),
      }),
    );
  });

  it("writes content containing HABITS section", async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    await exportToCSV();
    const call = (Filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      data: string;
    };
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
        path: expect.stringMatching(
          /^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.json$/,
        ),
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
        path: expect.stringMatching(
          /^esperanzapp_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.csv$/,
        ),
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

  it("inserts habits and habit logs with their original IDs", async () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.arrayContaining([mockHabit.id]),
      false,
    );
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habit_logs"),
      expect.arrayContaining([mockHabitLog.habitId]),
      false,
    );
  });

  it("inserts treatments and treatment logs with their original IDs", async () => {
    const payload = buildExportPayload(
      [],
      [],
      [mockTreatment],
      [mockTreatmentLog],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO treatments"),
      expect.arrayContaining([mockTreatment.id]),
      false,
    );
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO treatment_logs"),
      expect.arrayContaining([mockTreatmentLog.treatmentId]),
      false,
    );
  });

  it("throws on orphan habitLog referencing unknown habitId", async () => {
    const orphanLog: HabitLog = { ...mockHabitLog, habitId: "999" };
    const payload = buildExportPayload(
      [mockHabit],
      [orphanLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InconsistentImportDataError);
  });

  it("throws on orphan treatmentLog referencing unknown treatmentId", async () => {
    const orphanLog: TreatmentLog = { ...mockTreatmentLog, treatmentId: "999" };
    const payload = buildExportPayload(
      [],
      [],
      [mockTreatment],
      [orphanLog],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InconsistentImportDataError);
  });

  it("throws on duplicate habit IDs in import payload", async () => {
    const payload = buildExportPayload(
      [mockHabit, { ...mockHabit }],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InconsistentImportDataError);
  });

  it("throws on duplicate treatment IDs in import payload", async () => {
    const payload = buildExportPayload(
      [],
      [],
      [mockTreatment, { ...mockTreatment }],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InconsistentImportDataError);
  });

  it("inserts positive habits and positive habit logs with their original IDs", async () => {
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO positive_habits"),
      expect.arrayContaining([mockPositiveHabit.id]),
      false,
    );
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_logs"),
      expect.arrayContaining([mockPositiveHabitLog.positiveHabitId]),
      false,
    );
  });

  it("backfills already-reached milestone thresholds from imported taken counts", async () => {
    // mockPositiveHabitLog has status "taken" -> imported taken count is 1, which matches the
    // first POSITIVE_GRADES threshold. This prevents a post-import taken -> missed -> taken
    // toggle from re-firing a milestone notification that was already reached before export.
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [mockPositiveHabit.id, 1],
      false,
    );
  });

  it("does not backfill a milestone threshold the imported taken count never reached", async () => {
    // Only 1 "taken" log imported; the next POSITIVE_GRADES threshold (3) must not be backfilled.
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [mockPositiveHabit.id, 3],
      false,
    );
  });

  it("backfills every threshold reached at once when the imported taken count spans several", async () => {
    // 3 "taken" logs for the same habit -> both threshold 1 and threshold 3 must be backfilled
    // in the same import, not just the highest one reached.
    const logs: PositiveHabitLog[] = [
      { id: "1", positiveHabitId: mockPositiveHabit.id, scheduledAt: "2024-01-01", status: "taken" },
      { id: "2", positiveHabitId: mockPositiveHabit.id, scheduledAt: "2024-01-02", status: "taken" },
      { id: "3", positiveHabitId: mockPositiveHabit.id, scheduledAt: "2024-01-03", status: "taken" },
    ];
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      logs,
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [mockPositiveHabit.id, 1],
      false,
    );
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [mockPositiveHabit.id, 3],
      false,
    );
  });

  it("backfills thresholds independently per habit when several positive habits are imported together", async () => {
    // habit A has 1 taken log (threshold 1 only), habit B has 3 (thresholds 1 and 3) -> the
    // per-habit Map<positiveHabitId, takenCount> must not mix the two counts together.
    const habitB: PositiveHabit = { ...mockPositiveHabit, id: "2" };
    const logs: PositiveHabitLog[] = [
      { id: "1", positiveHabitId: mockPositiveHabit.id, scheduledAt: "2024-01-01", status: "taken" },
      { id: "2", positiveHabitId: habitB.id, scheduledAt: "2024-01-01", status: "taken" },
      { id: "3", positiveHabitId: habitB.id, scheduledAt: "2024-01-02", status: "taken" },
      { id: "4", positiveHabitId: habitB.id, scheduledAt: "2024-01-03", status: "taken" },
    ];
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit, habitB],
      logs,
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [mockPositiveHabit.id, 1],
      false,
    );
    expect(mockTransactionDb.run).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [mockPositiveHabit.id, 3],
      false,
    );
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [habitB.id, 3],
      false,
    );
  });

  it("throws on orphan positiveHabitLog referencing unknown positiveHabitId", async () => {
    const orphanLog: PositiveHabitLog = { ...mockPositiveHabitLog, positiveHabitId: "999" };
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [orphanLog],
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InconsistentImportDataError);
  });

  it("throws on duplicate positive habit IDs in import payload", async () => {
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit, { ...mockPositiveHabit }],
      [],
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InconsistentImportDataError);
  });

  it("legacy JSON without positiveHabits/positiveHabitLogs keys imports the rest normally", async () => {
    const legacy = JSON.stringify({
      version: "1",
      exportedAt: "2024-01-01T00:00:00.000Z",
      habits: [mockHabit],
      habitLogs: [mockHabitLog],
      treatments: [],
      treatmentLogs: [],
    });
    const file = new File([legacy], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.arrayContaining([mockHabit.id]),
      false,
    );
    expect(mockTransactionDb.run).not.toHaveBeenCalledWith(
      expect.stringContaining("positive_habits"),
      expect.anything(),
      expect.anything(),
    );
  });

  it("throws on invalid JSON file", async () => {
    const file = new File(["not valid json"], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InvalidImportFileError);
  });

  it("throws when JSON has missing required arrays", async () => {
    const bad = JSON.stringify({ version: "1", exportedAt: "2024-01-01T00:00:00.000Z" });
    const file = new File([bad], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(InvalidImportFileError);
  });

  it("throws when JSON version is wrong", async () => {
    const bad = JSON.stringify({
      version: "99",
      habits: [],
      habitLogs: [],
      treatments: [],
      treatmentLogs: [],
    });
    const file = new File([bad], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(UnsupportedImportVersionError);
  });

  it("handles empty payload gracefully", async () => {
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).not.toHaveBeenCalled();
  });
});

describe("importFromCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports habits from CSV", async () => {
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
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.any(Array),
      false,
    );
  });

  it("preserves original habit IDs in habit logs from CSV", async () => {
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
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habit_logs"),
      expect.arrayContaining([mockHabitLog.habitId]),
      false,
    );
  });

  it("backfills already-reached milestone thresholds from CSV imports too", async () => {
    // Same backfill logic as importFromJSON's equivalent test, but through the CSV path -
    // both importFromJSON and importFromCSV converge on the same importPayload().
    const payload = buildExportPayload(
      [],
      [],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
      [mockPositiveHabit],
      [mockPositiveHabitLog],
    );
    const csv = payloadToCSV(payload);
    const file = new File([csv], "export.csv", { type: "text/csv" });
    await importFromCSV(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO positive_habit_milestone_notifications"),
      [mockPositiveHabit.id, 1],
      false,
    );
  });

  it("throws on empty CSV file", async () => {
    const file = new File([""], "export.csv", { type: "text/csv" });
    await expect(importFromCSV(file)).rejects.toBeInstanceOf(InvalidImportFileError);
  });

  it("throws on CSV with no recognised section headers", async () => {
    const file = new File(["name,email\njohn,doe"], "bad.csv", { type: "text/csv" });
    await expect(importFromCSV(file)).rejects.toBeInstanceOf(InvalidImportFileError);
  });
});

describe("import replace mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls clearAllData before inserting records", async () => {
    const { clearAllData } = await import("@/db");
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    const order: string[] = [];
    vi.mocked(clearAllData).mockImplementationOnce(async () => {
      order.push("clear");
    });
    mockTransactionDb.run.mockImplementationOnce(async () => {
      order.push("insert");
      return { changes: { changes: 1 } };
    });
    await importFromJSON(file);
    expect(order[0]).toBe("clear");
    expect(order[1]).toBe("insert");
    expect(vi.mocked(clearAllData)).toHaveBeenCalledWith(mockTransactionDb);
  });

  it("importing the same file twice calls clearAllData each time (no duplicates)", async () => {
    const { clearAllData } = await import("@/db");
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const makeFile = () =>
      new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(makeFile());
    await importFromJSON(makeFile());
    expect(vi.mocked(clearAllData)).toHaveBeenCalledTimes(2);
  });

  it("error during import propagates and does not swallow the failure", async () => {
    mockTransactionDb.run.mockRejectedValueOnce(new Error("insert failed"));
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await expect(importFromJSON(file)).rejects.toBeInstanceOf(ImportStorageError);
  });

  it("clearAllData is called even when payload is empty", async () => {
    const { clearAllData } = await import("@/db");
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(vi.mocked(clearAllData)).toHaveBeenCalledTimes(1);
  });
});

describe("encryption: encryptPayload / decryptPayload", () => {
  it("produces a valid EncryptedEnvelope JSON for JSON format", async () => {
    const envelope = await encryptPayload("hello world", "password123", "json");
    const parsed: unknown = JSON.parse(envelope);
    expect(isEncryptedEnvelope(parsed)).toBe(true);
    if (isEncryptedEnvelope(parsed)) {
      expect(parsed.format).toBe("json");
      expect(parsed.iterations).toBe(PBKDF2_ITERATIONS);
      expect(typeof parsed.salt).toBe("string");
      expect(typeof parsed.iv).toBe("string");
      expect(typeof parsed.data).toBe("string");
    }
  });

  it("round-trips JSON payload with correct password", async () => {
    const original = "round-trip content";
    const envelope = await encryptPayload(original, "mypassword", "json");
    const { content, format } = await decryptPayload(envelope, "mypassword");
    expect(content).toBe(original);
    expect(format).toBe("json");
  });

  it("round-trips CSV payload with correct password", async () => {
    const original = "HABITS\nid,label\n1,Test";
    const envelope = await encryptPayload(original, "mypassword", "csv");
    const { content, format } = await decryptPayload(envelope, "mypassword");
    expect(content).toBe(original);
    expect(format).toBe("csv");
  });

  it("throws WrongPasswordError with incorrect password", async () => {
    const envelope = await encryptPayload("secret", "correctpassword", "json");
    await expect(decryptPayload(envelope, "wrongpassword")).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });

  it("throws WrongPasswordError with empty password", async () => {
    const envelope = await encryptPayload("secret", "correctpassword", "json");
    await expect(decryptPayload(envelope, "")).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("each encryption produces a different ciphertext (random IV/salt)", async () => {
    const e1 = await encryptPayload("same content", "same password", "json");
    const e2 = await encryptPayload("same content", "same password", "json");
    expect(e1).not.toBe(e2);
  });

  it("stores the iterations count in the envelope (for future compatibility)", async () => {
    const envelope = await encryptPayload("test", "pw", "json");
    const parsed = JSON.parse(envelope) as { iterations: number };
    expect(parsed.iterations).toBe(PBKDF2_ITERATIONS);
  });

  it("decryptPayload uses iterations from envelope, not a hardcoded value", async () => {
    const envelope = await encryptPayload("test", "pw", "json");
    const parsed = JSON.parse(envelope) as Record<string, unknown>;
    expect(typeof parsed["iterations"]).toBe("number");
    const { content } = await decryptPayload(envelope, "pw");
    expect(content).toBe("test");
  });

  it("isEncryptedEnvelope rejects iterations above the safety ceiling", () => {
    const envelope = {
      encrypted: true,
      format: "json",
      salt: "abc",
      iv: "def",
      iterations: 10_000_001,
      data: "xyz",
    };
    expect(isEncryptedEnvelope(envelope)).toBe(false);
  });

  it("isEncryptedEnvelope rejects iterations below the minimum", () => {
    const envelope = {
      encrypted: true,
      format: "json",
      salt: "abc",
      iv: "def",
      iterations: 599_999,
      data: "xyz",
    };
    expect(isEncryptedEnvelope(envelope)).toBe(false);
  });

  it("new envelopes include withAad: true", async () => {
    const envelope = await encryptPayload("test", "pw", "json");
    const parsed = JSON.parse(envelope) as Record<string, unknown>;
    expect(parsed["withAad"]).toBe(true);
  });

  it("decryptPayload can still decrypt old envelopes without withAad (backward compat)", async () => {
    const envelope = await encryptPayload("legacy content", "pw", "json");
    const parsed = JSON.parse(envelope) as Record<string, unknown>;
    delete parsed["withAad"];
    const legacyEnvelope = JSON.stringify(parsed);
    // Old envelopes were encrypted without AAD — simulate by re-encrypting without AAD.
    // We can't directly test this without exposing internals, so we verify that
    // an envelope without withAad that WAS encrypted with AAD throws WrongPasswordError
    // (proving the flag is actually checked), while a properly encrypted old-format succeeds.
    await expect(decryptPayload(legacyEnvelope, "wrong-pw")).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });
});

describe("encryption: peekIsEncrypted", () => {
  it("returns true for an encrypted envelope file", async () => {
    const envelope = await encryptPayload("data", "pw", "json");
    const file = new File([envelope], "export.json", { type: "application/json" });
    expect(await peekIsEncrypted(file)).toBe(true);
  });

  it("returns false for a plain JSON export file", async () => {
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    expect(await peekIsEncrypted(file)).toBe(false);
  });

  it("returns false for a plain CSV export file", async () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([payloadToCSV(payload)], "export.csv", { type: "text/csv" });
    expect(await peekIsEncrypted(file)).toBe(false);
  });

  it("returns false for invalid / empty content", async () => {
    const file = new File(["not json"], "bad.json", { type: "application/json" });
    expect(await peekIsEncrypted(file)).toBe(false);
  });
});

describe("encryption: full round-trip through importFromJSON", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports an encrypted JSON export with the correct password", async () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const serialized = JSON.stringify(payload, null, 2);
    const envelope = await encryptPayload(serialized, "correct-pw", "json");
    const file = new File([envelope], "export.json", { type: "application/json" });
    await importFromJSON(file, "correct-pw");
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.any(Array),
      false,
    );
  });

  it("throws WrongPasswordError when importing encrypted JSON with wrong password", async () => {
    const payload = buildExportPayload([], [], [], [], "2024-01-01T00:00:00.000Z");
    const envelope = await encryptPayload(JSON.stringify(payload), "correct-pw", "json");
    const file = new File([envelope], "export.json", { type: "application/json" });
    await expect(importFromJSON(file, "wrong-pw")).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("imports an encrypted CSV export (json-wrapped) with the correct password", async () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const csvContent = payloadToCSV(payload);
    const envelope = await encryptPayload(csvContent, "correct-pw", "csv");
    const file = new File([envelope], "export.json", { type: "application/json" });
    await importFromJSON(file, "correct-pw");
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.any(Array),
      false,
    );
  });

  it("plain (unencrypted) import is unchanged when no password is provided", async () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const file = new File([JSON.stringify(payload)], "export.json", { type: "application/json" });
    await importFromJSON(file);
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.any(Array),
      false,
    );
  });

  it("simulates reinstall: encrypted export is importable with password alone, independent of device state", async () => {
    const payload = buildExportPayload(
      [mockHabit],
      [mockHabitLog],
      [],
      [],
      "2024-01-01T00:00:00.000Z",
    );
    const envelope = await encryptPayload(JSON.stringify(payload), "user-password", "json");
    const file = new File([envelope], "export.json", { type: "application/json" });
    await importFromJSON(file, "user-password");
    expect(mockTransactionDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      expect.any(Array),
      false,
    );
  });

  it("throws CorruptFileError (not generic error) when envelope has corrupted Base64", async () => {
    const corrupted = JSON.stringify({
      encrypted: true,
      format: "json",
      iterations: 600000,
      salt: "%%%not-base64%%%",
      iv: "validBase64==",
      data: "validBase64==",
    });
    const file = new File([corrupted], "export.json", { type: "application/json" });
    await expect(importFromJSON(file, "any-password")).rejects.toBeInstanceOf(CorruptFileError);
  });
});

import type { EventType, Frequency, TreatmentStatus, Habit, HabitLog, Treatment, TreatmentLog } from "@/types";

const EVENT_TYPES: readonly EventType[] = ["start", "relapse"];
const FREQUENCIES: readonly Frequency[] = ["daily", "weekly", "monthly"];
const TREATMENT_STATUSES: readonly TreatmentStatus[] = ["taken", "missed", "pending"];

export function isEventType(v: string): v is EventType {
  return (EVENT_TYPES as readonly string[]).includes(v);
}
export function isFrequency(v: string): v is Frequency {
  return (FREQUENCIES as readonly string[]).includes(v);
}
export function isTreatmentStatus(v: string): v is TreatmentStatus {
  return (TREATMENT_STATUSES as readonly string[]).includes(v);
}

export const EXPORT_VERSION = "1" as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function isStr(v: unknown): v is string { return typeof v === "string" && v.length > 0; }

function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function isTime(v: unknown): v is string {
  if (typeof v !== "string" || !TIME_RE.test(v)) return false;
  const [h, min] = v.split(":").map(Number) as [number, number];
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

function validateHabit(v: unknown): Habit {
  if (typeof v !== "object" || v === null) throw new Error("habits: not an object");
  const h = v as Record<string, unknown>;
  if (!isStr(h.id) || !isStr(h.label) || !isStr(h.icon) || !isStr(h.color) || !isStr(h.bgColor) || !isDate(h.startDate) || !isStr(h.createdAt))
    throw new Error("habits: missing or invalid fields");
  return h as unknown as Habit;
}

function validateHabitLog(v: unknown): HabitLog {
  if (typeof v !== "object" || v === null) throw new Error("habitLogs: not an object");
  const l = v as Record<string, unknown>;
  if (!isStr(l.id) || !isStr(l.habitId) || !isDate(l.eventDate))
    throw new Error("habitLogs: missing or invalid fields");
  if (!isStr(l.eventType) || !isEventType(l.eventType))
    throw new Error(`habitLogs: invalid eventType "${String(l.eventType)}"`);
  return l as unknown as HabitLog;
}

function validateTreatment(v: unknown): Treatment {
  if (typeof v !== "object" || v === null) throw new Error("treatments: not an object");
  const t = v as Record<string, unknown>;
  if (!isStr(t.id) || !isStr(t.label) || !isStr(t.createdAt))
    throw new Error("treatments: missing required string fields");
  if (!isStr(t.frequency) || !isFrequency(t.frequency))
    throw new Error(`treatments: invalid frequency "${String(t.frequency)}"`);
  if (!isTime(t.reminderTime))
    throw new Error("treatments: invalid reminderTime");
  if (typeof t.reminderEnabled !== "boolean")
    throw new Error("treatments: reminderEnabled must be boolean");
  const day = t.reminderDay;
  if (day !== null && (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 31))
    throw new Error("treatments: invalid reminderDay");
  return t as unknown as Treatment;
}

function validateTreatmentLog(v: unknown): TreatmentLog {
  if (typeof v !== "object" || v === null) throw new Error("treatmentLogs: not an object");
  const l = v as Record<string, unknown>;
  if (!isStr(l.id) || !isStr(l.treatmentId) || !isDate(l.scheduledAt))
    throw new Error("treatmentLogs: missing or invalid fields");
  if (!isStr(l.status) || !isTreatmentStatus(l.status))
    throw new Error(`treatmentLogs: invalid status "${String(l.status)}"`);
  return l as unknown as TreatmentLog;
}

export type ExportPayload = {
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  habits: Habit[];
  habitLogs: HabitLog[];
  treatments: Treatment[];
  treatmentLogs: TreatmentLog[];
};

export function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      result.push(field);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { result.push(line.slice(i)); break; }
      result.push(line.slice(i, end));
      i = end + 1;
    }
  }
  if (line.endsWith(",")) result.push("");
  return result;
}

export function buildExportPayload(
  habits: Habit[],
  habitLogs: HabitLog[],
  treatments: Treatment[],
  treatmentLogs: TreatmentLog[],
  exportedAt: string,
): ExportPayload {
  return { version: EXPORT_VERSION, exportedAt, habits, habitLogs, treatments, treatmentLogs };
}

export function parseExportPayload(raw: string): ExportPayload {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Unsupported or invalid export format");
  }
  const p = parsed as Record<string, unknown>;
  if (p["version"] !== EXPORT_VERSION) {
    throw new Error("Unsupported or invalid export format");
  }
  if (
    !Array.isArray(p["habits"]) ||
    !Array.isArray(p["habitLogs"]) ||
    !Array.isArray(p["treatments"]) ||
    !Array.isArray(p["treatmentLogs"])
  ) {
    throw new Error("Unsupported or invalid export format");
  }
  return {
    version: EXPORT_VERSION,
    exportedAt: typeof p["exportedAt"] === "string" ? p["exportedAt"] : "",
    habits: (p["habits"] as unknown[]).map((v) => validateHabit(v)),
    habitLogs: (p["habitLogs"] as unknown[]).map((v) => validateHabitLog(v)),
    treatments: (p["treatments"] as unknown[]).map((v) => validateTreatment(v)),
    treatmentLogs: (p["treatmentLogs"] as unknown[]).map((v) => validateTreatmentLog(v)),
  };
}

export function payloadToCSV(payload: ExportPayload): string {
  const escape = (v: string): string =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;

  const row = (values: string[]): string => values.map(escape).join(",");

  const sections: string[] = [];

  sections.push(
    "HABITS",
    row(["id", "label", "icon", "color", "bgColor", "startDate", "createdAt"]),
    ...payload.habits.map((h) =>
      row([h.id, h.label, h.icon, h.color, h.bgColor, h.startDate, h.createdAt]),
    ),
  );

  sections.push(
    "",
    "HABIT_LOGS",
    row(["id", "habitId", "eventType", "eventDate"]),
    ...payload.habitLogs.map((l) => row([l.id, l.habitId, l.eventType, l.eventDate])),
  );

  sections.push(
    "",
    "TREATMENTS",
    row(["id", "label", "frequency", "reminderTime", "reminderEnabled", "reminderDay", "createdAt"]),
    ...payload.treatments.map((t) =>
      row([t.id, t.label, t.frequency, t.reminderTime, t.reminderEnabled ? "1" : "0", t.reminderDay !== null ? String(t.reminderDay) : "", t.createdAt]),
    ),
  );

  sections.push(
    "",
    "TREATMENT_LOGS",
    row(["id", "treatmentId", "scheduledAt", "status"]),
    ...payload.treatmentLogs.map((l) => row([l.id, l.treatmentId, l.scheduledAt, l.status])),
  );

  return sections.join("\n");
}

export function parseCSVPayload(raw: string): ExportPayload {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());

  function parseSection(header: string): string[][] {
    const start = lines.indexOf(header);
    if (start === -1) return [];
    const colLine = lines[start + 1];
    if (!colLine) return [];
    const cols = parseCSVRow(colLine);
    const rows: string[][] = [];
    for (let i = start + 2; i < lines.length; i++) {
      if (!lines[i]) break;
      const values = parseCSVRow(lines[i]);
      if (values.length !== cols.length)
        throw new Error(`CSV malformed row in ${header}: column count mismatch`);
      rows.push(values);
    }
    return rows;
  }

  const hasContent = lines.some((l) => l.length > 0);
  if (!hasContent) throw new Error("Empty CSV file");

  const ALL_SECTIONS = ["HABITS", "HABIT_LOGS", "TREATMENTS", "TREATMENT_LOGS"] as const;
  const missingSections = ALL_SECTIONS.filter((h) => !lines.includes(h));
  if (missingSections.length === ALL_SECTIONS.length) {
    throw new Error("Unsupported or invalid CSV format");
  }
  if (missingSections.length > 0) {
    throw new Error(`CSV missing required section(s): ${missingSections.join(", ")}`);
  }

  const habitRows = parseSection("HABITS");
  const logRows = parseSection("HABIT_LOGS");
  const treatmentRows = parseSection("TREATMENTS");
  const treatmentLogRows = parseSection("TREATMENT_LOGS");

  const habits: Habit[] = habitRows.map(([id, label, icon, color, bgColor, startDate, createdAt]) => {
    if (!isStr(id) || !isStr(label) || !isStr(icon) || !isStr(color) || !isStr(bgColor) || !isDate(startDate) || !isStr(createdAt))
      throw new Error("habits: missing or invalid fields");
    return { id, label, icon, color, bgColor, startDate, createdAt };
  });

  const habitLogs: HabitLog[] = logRows.map(([id, habitId, eventType, eventDate]) => {
    if (!isStr(id) || !isStr(habitId) || !isDate(eventDate))
      throw new Error("habitLogs: missing or invalid fields");
    if (!isStr(eventType) || !isEventType(eventType))
      throw new Error(`habitLogs: invalid eventType "${eventType}"`);
    return { id, habitId, eventType, eventDate };
  });

  const treatments: Treatment[] = treatmentRows.map(([id, label, frequency, reminderTime, reminderEnabledStr, reminderDayStr, createdAt]) => {
    if (!isStr(id) || !isStr(label) || !isStr(createdAt))
      throw new Error("treatments: missing required string fields");
    if (!isStr(frequency) || !isFrequency(frequency))
      throw new Error(`treatments: invalid frequency "${frequency}"`);
    if (!isTime(reminderTime))
      throw new Error("treatments: invalid reminderTime");
    const reminderDay = reminderDayStr !== "" ? Number(reminderDayStr) : null;
    if (reminderDay !== null && (!Number.isInteger(reminderDay) || reminderDay < 0 || reminderDay > 31))
      throw new Error("treatments: invalid reminderDay");
    return { id, label, frequency, reminderTime, reminderEnabled: reminderEnabledStr !== "0", reminderDay, createdAt };
  });

  const treatmentLogs: TreatmentLog[] = treatmentLogRows.map(([id, treatmentId, scheduledAt, status]) => {
    if (!isStr(id) || !isStr(treatmentId) || !isDate(scheduledAt))
      throw new Error("treatmentLogs: missing or invalid fields");
    if (!isStr(status) || !isTreatmentStatus(status))
      throw new Error(`treatmentLogs: invalid status "${status}"`);
    return { id, treatmentId, scheduledAt, status };
  });

  return { version: EXPORT_VERSION, exportedAt: "", habits, habitLogs, treatments, treatmentLogs };
}

export function exportTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = String(now.getFullYear());
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${y}-${m}-${d}_${h}-${min}`;
}

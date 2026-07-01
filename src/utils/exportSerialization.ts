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

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
function isHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX_COLOR_RE.test(v);
}

function isISODateTime(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0) return false;
  return !isNaN(new Date(v).getTime());
}

function validateHabit(v: unknown): Habit {
  if (typeof v !== "object" || v === null) throw new Error("habits: not an object");
  const h = v as Record<string, unknown>;
  const id = h["id"];
  const label = h["label"];
  const icon = h["icon"];
  const color = h["color"];
  const bgColor = h["bgColor"];
  const startDate = h["startDate"];
  const createdAt = h["createdAt"];
  if (!isStr(id)) throw new Error("habits: id must be a non-empty string");
  if (!isStr(label)) throw new Error("habits: label must be a non-empty string");
  if (!isStr(icon)) throw new Error("habits: icon must be a non-empty string");
  if (!isHexColor(color)) throw new Error("habits: color must be a hex color");
  if (!isHexColor(bgColor)) throw new Error("habits: bgColor must be a hex color");
  if (!isDate(startDate)) throw new Error("habits: startDate must be YYYY-MM-DD");
  if (!isISODateTime(createdAt)) throw new Error("habits: createdAt must be a valid date-time");
  return { id, label, icon, color, bgColor, startDate, createdAt };
}

function validateHabitLog(v: unknown): HabitLog {
  if (typeof v !== "object" || v === null) throw new Error("habitLogs: not an object");
  const l = v as Record<string, unknown>;
  const id = l["id"];
  const habitId = l["habitId"];
  const eventType = l["eventType"];
  const eventDate = l["eventDate"];
  if (!isStr(id)) throw new Error("habitLogs: id must be a non-empty string");
  if (!isStr(habitId)) throw new Error("habitLogs: habitId must be a non-empty string");
  if (!isStr(eventType) || !isEventType(eventType))
    throw new Error(`habitLogs: invalid eventType "${String(eventType)}"`);
  if (!isDate(eventDate)) throw new Error("habitLogs: eventDate must be YYYY-MM-DD");
  return { id, habitId, eventType, eventDate };
}

function validateTreatment(v: unknown): Treatment {
  if (typeof v !== "object" || v === null) throw new Error("treatments: not an object");
  const t = v as Record<string, unknown>;
  const id = t["id"];
  const label = t["label"];
  const frequency = t["frequency"];
  const reminderTime = t["reminderTime"];
  const reminderEnabled = t["reminderEnabled"];
  const reminderDay = t["reminderDay"];
  const createdAt = t["createdAt"];
  if (!isStr(id)) throw new Error("treatments: id must be a non-empty string");
  if (!isStr(label)) throw new Error("treatments: label must be a non-empty string");
  if (!isStr(frequency) || !isFrequency(frequency))
    throw new Error(`treatments: invalid frequency "${String(frequency)}"`);
  if (!isTime(reminderTime)) throw new Error("treatments: invalid reminderTime");
  if (typeof reminderEnabled !== "boolean") throw new Error("treatments: reminderEnabled must be boolean");
  if (!isISODateTime(createdAt)) throw new Error("treatments: createdAt must be a valid date-time");
  let day: number | null;
  if (reminderDay === null) {
    day = null;
  } else if (typeof reminderDay === "number" && Number.isInteger(reminderDay)) {
    day = reminderDay;
  } else {
    throw new Error("treatments: reminderDay must be an integer or null");
  }
  if (frequency === "daily") {
    if (day !== null) throw new Error("treatments: daily frequency must have null reminderDay");
  } else if (frequency === "weekly") {
    if (day === null || day < 0 || day > 6)
      throw new Error("treatments: weekly frequency must have reminderDay 0-6");
  } else {
    if (day === null || day < 0 || day > 31)
      throw new Error("treatments: monthly frequency must have reminderDay 0-31");
  }
  return { id, label, frequency, reminderTime, reminderEnabled, reminderDay: day, createdAt };
}

function validateTreatmentLog(v: unknown): TreatmentLog {
  if (typeof v !== "object" || v === null) throw new Error("treatmentLogs: not an object");
  const l = v as Record<string, unknown>;
  const id = l["id"];
  const treatmentId = l["treatmentId"];
  const scheduledAt = l["scheduledAt"];
  const status = l["status"];
  if (!isStr(id)) throw new Error("treatmentLogs: id must be a non-empty string");
  if (!isStr(treatmentId)) throw new Error("treatmentLogs: treatmentId must be a non-empty string");
  if (!isStr(status) || !isTreatmentStatus(status))
    throw new Error(`treatmentLogs: invalid status "${String(status)}"`);
  if (!isDate(scheduledAt)) throw new Error("treatmentLogs: scheduledAt must be YYYY-MM-DD");
  return { id, treatmentId, scheduledAt, status };
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

const HABIT_COLS = ["id", "label", "icon", "color", "bgColor", "startDate", "createdAt"] as const;
const HABIT_LOG_COLS = ["id", "habitId", "eventType", "eventDate"] as const;
const TREATMENT_COLS = ["id", "label", "frequency", "reminderTime", "reminderEnabled", "reminderDay", "createdAt"] as const;
const TREATMENT_LOG_COLS = ["id", "treatmentId", "scheduledAt", "status"] as const;

export function parseCSVPayload(raw: string): ExportPayload {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());

  function parseSection(header: string, expectedCols: readonly string[]): string[][] {
    const start = lines.indexOf(header);
    if (start === -1) return [];
    const colLine = lines[start + 1];
    if (!colLine) throw new Error(`CSV section ${header}: missing column header row`);
    const cols = parseCSVRow(colLine);
    if (cols.join(",") !== expectedCols.join(","))
      throw new Error(`CSV section ${header}: expected columns "${expectedCols.join(",")}", got "${cols.join(",")}"`);
    const rows: string[][] = [];
    for (let i = start + 2; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (!line) break;
      const values = parseCSVRow(line);
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

  const habitRows = parseSection("HABITS", HABIT_COLS);
  const logRows = parseSection("HABIT_LOGS", HABIT_LOG_COLS);
  const treatmentRows = parseSection("TREATMENTS", TREATMENT_COLS);
  const treatmentLogRows = parseSection("TREATMENT_LOGS", TREATMENT_LOG_COLS);

  const habits: Habit[] = habitRows.map(([id, label, icon, color, bgColor, startDate, createdAt]) => {
    if (!isStr(id)) throw new Error("habits: id must be a non-empty string");
    if (!isStr(label)) throw new Error("habits: label must be a non-empty string");
    if (!isStr(icon)) throw new Error("habits: icon must be a non-empty string");
    if (!isHexColor(color)) throw new Error("habits: color must be a hex color");
    if (!isHexColor(bgColor)) throw new Error("habits: bgColor must be a hex color");
    if (!isDate(startDate)) throw new Error("habits: startDate must be YYYY-MM-DD");
    if (!isISODateTime(createdAt)) throw new Error("habits: createdAt must be a valid date-time");
    return { id, label, icon, color, bgColor, startDate, createdAt };
  });

  const habitLogs: HabitLog[] = logRows.map(([id, habitId, eventType, eventDate]) => {
    if (!isStr(id)) throw new Error("habitLogs: id must be a non-empty string");
    if (!isStr(habitId)) throw new Error("habitLogs: habitId must be a non-empty string");
    if (!isStr(eventType) || !isEventType(eventType))
      throw new Error(`habitLogs: invalid eventType "${eventType}"`);
    if (!isDate(eventDate)) throw new Error("habitLogs: eventDate must be YYYY-MM-DD");
    return { id, habitId, eventType, eventDate };
  });

  const treatments: Treatment[] = treatmentRows.map(([id, label, frequency, reminderTime, reminderEnabledStr, reminderDayStr, createdAt]) => {
    if (!isStr(id)) throw new Error("treatments: id must be a non-empty string");
    if (!isStr(label)) throw new Error("treatments: label must be a non-empty string");
    if (!isStr(frequency) || !isFrequency(frequency))
      throw new Error(`treatments: invalid frequency "${frequency}"`);
    if (!isTime(reminderTime)) throw new Error("treatments: invalid reminderTime");
    if (!isISODateTime(createdAt)) throw new Error("treatments: createdAt must be a valid date-time");
    const reminderDay = reminderDayStr !== "" ? Number(reminderDayStr) : null;
    if (reminderDay !== null && (!Number.isInteger(reminderDay) || reminderDay < 0 || reminderDay > 31))
      throw new Error("treatments: invalid reminderDay");
    if (frequency === "daily") {
      if (reminderDay !== null) throw new Error("treatments: daily frequency must have null reminderDay");
    } else if (frequency === "weekly") {
      if (reminderDay === null || reminderDay < 0 || reminderDay > 6)
        throw new Error("treatments: weekly frequency must have reminderDay 0-6");
    } else {
      if (reminderDay === null || reminderDay < 0 || reminderDay > 31)
        throw new Error("treatments: monthly frequency must have reminderDay 0-31");
    }
    return { id, label, frequency, reminderTime, reminderEnabled: reminderEnabledStr !== "0", reminderDay, createdAt };
  });

  const treatmentLogs: TreatmentLog[] = treatmentLogRows.map(([id, treatmentId, scheduledAt, status]) => {
    if (!isStr(id)) throw new Error("treatmentLogs: id must be a non-empty string");
    if (!isStr(treatmentId)) throw new Error("treatmentLogs: treatmentId must be a non-empty string");
    if (!isStr(status) || !isTreatmentStatus(status))
      throw new Error(`treatmentLogs: invalid status "${status}"`);
    if (!isDate(scheduledAt)) throw new Error("treatmentLogs: scheduledAt must be YYYY-MM-DD");
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

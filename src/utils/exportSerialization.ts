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

export class UnsupportedExportVersionError extends Error {
  constructor() {
    super("Unsupported export version");
    this.name = "UnsupportedExportVersionError";
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function isStr(v: unknown): v is string { return typeof v === "string" && v.length > 0; }
// SQLite IDs are INTEGER PRIMARY KEY AUTOINCREMENT — only positive integer strings are valid.
function isPosIntStr(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0) return false;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && String(n) === v;
}

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
  if (!isPosIntStr(id)) throw new Error("habits: id must be a positive integer string");
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
  if (!isPosIntStr(id)) throw new Error("habitLogs: id must be a positive integer string");
  if (!isPosIntStr(habitId)) throw new Error("habitLogs: habitId must be a positive integer string");
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
  if (!isPosIntStr(id)) throw new Error("treatments: id must be a positive integer string");
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
    if (day === null || (day !== 0 && (day < 1 || day > 28)))
      throw new Error("treatments: monthly frequency must have reminderDay 0 or 1-28");
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
  if (!isPosIntStr(id)) throw new Error("treatmentLogs: id must be a positive integer string");
  if (!isPosIntStr(treatmentId)) throw new Error("treatmentLogs: treatmentId must be a positive integer string");
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
    if (typeof p["version"] === "string") throw new UnsupportedExportVersionError();
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

// Character-by-character CSV tokenizer that correctly handles quoted fields containing
// embedded newlines, double-quote escapes (""), and carriage-return/newline line endings.
// Each element of the returned array is one logical row (itself an array of field strings).
function tokenizeCSV(raw: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i] ?? "";
    if (ch === '"') {
      i++;
      let closed = false;
      while (i < raw.length) {
        if (raw[i] === '"') {
          if (raw[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; closed = true; break; }
        } else {
          field += raw[i++] ?? "";
        }
      }
      if (!closed) throw new Error("Unterminated quoted field in CSV");
    } else if (ch === ',') {
      row.push(field);
      field = "";
      i++;
    } else if (ch === '\r') {
      row.push(field);
      field = "";
      result.push(row);
      row = [];
      i++;
      if (raw[i] === '\n') i++;
    } else if (ch === '\n') {
      row.push(field);
      field = "";
      result.push(row);
      row = [];
      i++;
    } else {
      field += ch;
      i++;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    result.push(row);
  }

  return result;
}

export function parseCSVPayload(raw: string): ExportPayload {
  const rows = tokenizeCSV(raw);

  const hasContent = rows.some((r) => r.some((f) => f.length > 0));
  if (!hasContent) throw new Error("Empty CSV file");

  const ALL_SECTIONS = ["HABITS", "HABIT_LOGS", "TREATMENTS", "TREATMENT_LOGS"] as const;

  function isSectionHeader(r: string[]): r is [string] {
    return r.length === 1 && r[0] !== "";
  }

  const sectionNames = new Set(rows.filter(isSectionHeader).map((r) => r[0]));
  const missingSections = ALL_SECTIONS.filter((h) => !sectionNames.has(h));
  if (missingSections.length === ALL_SECTIONS.length) {
    throw new Error("Unsupported or invalid CSV format");
  }
  if (missingSections.length > 0) {
    throw new Error(`CSV missing required section(s): ${missingSections.join(", ")}`);
  }

  function parseSection(header: string, expectedCols: readonly string[]): string[][] {
    const start = rows.findIndex((r) => r.length === 1 && r[0] === header);
    if (start === -1) return [];
    const colRow = rows[start + 1];
    if (!colRow) throw new Error(`CSV section ${header}: missing column header row`);
    if (colRow.join(",") !== expectedCols.join(","))
      throw new Error(`CSV section ${header}: expected columns "${expectedCols.join(",")}", got "${colRow.join(",")}"`);
    const data: string[][] = [];
    for (let i = start + 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length <= 1) break; // empty row or next section header
      if (r.length !== colRow.length)
        throw new Error(`CSV malformed row in ${header}: column count mismatch`);
      data.push(r);
    }
    return data;
  }

  const habitRows = parseSection("HABITS", HABIT_COLS);
  const logRows = parseSection("HABIT_LOGS", HABIT_LOG_COLS);
  const treatmentRows = parseSection("TREATMENTS", TREATMENT_COLS);
  const treatmentLogRows = parseSection("TREATMENT_LOGS", TREATMENT_LOG_COLS);

  const habits: Habit[] = habitRows.map(([id, label, icon, color, bgColor, startDate, createdAt]) => {
    if (!isPosIntStr(id)) throw new Error("habits: id must be a positive integer string");
    if (!isStr(label)) throw new Error("habits: label must be a non-empty string");
    if (!isStr(icon)) throw new Error("habits: icon must be a non-empty string");
    if (!isHexColor(color)) throw new Error("habits: color must be a hex color");
    if (!isHexColor(bgColor)) throw new Error("habits: bgColor must be a hex color");
    if (!isDate(startDate)) throw new Error("habits: startDate must be YYYY-MM-DD");
    if (!isISODateTime(createdAt)) throw new Error("habits: createdAt must be a valid date-time");
    return { id, label, icon, color, bgColor, startDate, createdAt };
  });

  const habitLogs: HabitLog[] = logRows.map(([id, habitId, eventType, eventDate]) => {
    if (!isPosIntStr(id)) throw new Error("habitLogs: id must be a positive integer string");
    if (!isPosIntStr(habitId)) throw new Error("habitLogs: habitId must be a positive integer string");
    if (!isStr(eventType)) throw new Error("habitLogs: eventType must be a string");
    if (!isEventType(eventType)) throw new Error(`habitLogs: invalid eventType "${eventType}"`);
    if (!isDate(eventDate)) throw new Error("habitLogs: eventDate must be YYYY-MM-DD");
    return { id, habitId, eventType, eventDate };
  });

  const treatments: Treatment[] = treatmentRows.map(([id, label, frequency, reminderTime, reminderEnabledStr, reminderDayStr, createdAt]) => {
    if (!isPosIntStr(id)) throw new Error("treatments: id must be a positive integer string");
    if (!isStr(label)) throw new Error("treatments: label must be a non-empty string");
    if (!isStr(frequency)) throw new Error("treatments: frequency must be a string");
    if (!isFrequency(frequency)) throw new Error(`treatments: invalid frequency "${frequency}"`);
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
      if (reminderDay === null || (reminderDay !== 0 && (reminderDay < 1 || reminderDay > 28)))
        throw new Error("treatments: monthly frequency must have reminderDay 0 or 1-28");
    }
    if (reminderEnabledStr !== "0" && reminderEnabledStr !== "1")
      throw new Error(`treatments: reminderEnabled must be "0" or "1", got "${reminderEnabledStr ?? ""}"`);
    return { id, label, frequency, reminderTime, reminderEnabled: reminderEnabledStr === "1", reminderDay, createdAt };
  });

  const treatmentLogs: TreatmentLog[] = treatmentLogRows.map(([id, treatmentId, scheduledAt, status]) => {
    if (!isPosIntStr(id)) throw new Error("treatmentLogs: id must be a positive integer string");
    if (!isPosIntStr(treatmentId)) throw new Error("treatmentLogs: treatmentId must be a positive integer string");
    if (!isStr(status)) throw new Error("treatmentLogs: status must be a string");
    if (!isTreatmentStatus(status)) throw new Error(`treatmentLogs: invalid status "${status}"`);
    if (!isDate(scheduledAt)) throw new Error("treatmentLogs: scheduledAt must be YYYY-MM-DD");
    return { id, treatmentId, scheduledAt, status };
  });

  return { version: EXPORT_VERSION, exportedAt: "", habits, habitLogs, treatments, treatmentLogs };
}

// OWASP recommendation for PBKDF2-HMAC-SHA256 as of 2023.
// This constant is intentionally named and stored in exported files so it can be raised
// in future versions without breaking backward compatibility of existing encrypted exports.
export const PBKDF2_ITERATIONS = 600_000;

export class WrongPasswordError extends Error {
  constructor() {
    super("Wrong password");
    this.name = "WrongPasswordError";
  }
}

export type EncryptedEnvelope = {
  encrypted: true;
  format: "json" | "csv";
  salt: string;
  iv: string;
  iterations: number;
  data: string;
};

export function isEncryptedEnvelope(v: unknown): v is EncryptedEnvelope {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    e["encrypted"] === true &&
    (e["format"] === "json" || e["format"] === "csv") &&
    typeof e["salt"] === "string" &&
    typeof e["iv"] === "string" &&
    Number.isInteger(e["iterations"]) &&
    (e["iterations"] as number) >= 600_000 &&
    (e["iterations"] as number) <= 10_000_000 &&
    typeof e["data"] === "string"
  );
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const binary = atob(s);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPayload(
  serialized: string,
  password: string,
  format: "json" | "csv",
): Promise<string> {
  const salt = new Uint8Array(new ArrayBuffer(16));
  const iv = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(serialized),
  );
  const envelope: EncryptedEnvelope = {
    encrypted: true,
    format,
    salt: toBase64(salt),
    iv: toBase64(iv),
    iterations: PBKDF2_ITERATIONS,
    data: toBase64(encrypted),
  };
  return JSON.stringify(envelope);
}

export async function decryptPayload(envelopeJson: string, password: string): Promise<{ content: string; format: "json" | "csv" }> {
  const parsed: unknown = JSON.parse(envelopeJson);
  if (!isEncryptedEnvelope(parsed)) throw new Error("Invalid encrypted envelope");
  const salt = fromBase64(parsed.salt);
  const iv = fromBase64(parsed.iv);
  const data = fromBase64(parsed.data);
  const key = await deriveKey(password, salt, parsed.iterations);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return { content: new TextDecoder().decode(decrypted), format: parsed.format };
  } catch {
    throw new WrongPasswordError();
  }
}

export async function peekIsEncrypted(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    return isEncryptedEnvelope(parsed);
  } catch {
    return false;
  }
}

export function exportTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const padMilliseconds = (n: number) => String(n).padStart(3, "0");
  const y = String(now.getFullYear());
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  const sec = pad(now.getSeconds());
  const ms = padMilliseconds(now.getMilliseconds());
  return `${y}-${m}-${d}_${h}-${min}-${sec}-${ms}`;
}

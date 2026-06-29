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
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    (parsed as Record<string, unknown>).version !== EXPORT_VERSION
  ) {
    throw new Error("Unsupported or invalid export format");
  }
  return parsed as ExportPayload;
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
    row(["id", "label", "frequency", "reminderTime", "reminderEnabled", "createdAt"]),
    ...payload.treatments.map((t) =>
      row([t.id, t.label, t.frequency, t.reminderTime, t.reminderEnabled ? "1" : "0", t.createdAt]),
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
      if (values.length === cols.length) rows.push(values);
    }
    return rows;
  }

  const habitRows = parseSection("HABITS");
  const logRows = parseSection("HABIT_LOGS");
  const treatmentRows = parseSection("TREATMENTS");
  const treatmentLogRows = parseSection("TREATMENT_LOGS");

  const habits: Habit[] = habitRows.map(([id, label, icon, color, bgColor, startDate, createdAt]) => ({
    id, label, icon, color, bgColor, startDate, createdAt,
  }));

  const habitLogs: HabitLog[] = logRows.flatMap(([id, habitId, eventType, eventDate]) => {
    if (!isEventType(eventType)) return [];
    return [{ id, habitId, eventType, eventDate }];
  });

  const treatments: Treatment[] = treatmentRows.flatMap(([id, label, frequency, reminderTime, reminderEnabledStr, createdAt]) => {
    if (!isFrequency(frequency)) return [];
    return [{ id, label, frequency, reminderTime, reminderEnabled: reminderEnabledStr !== "0", createdAt }];
  });

  const treatmentLogs: TreatmentLog[] = treatmentLogRows.flatMap(([id, treatmentId, scheduledAt, status]) => {
    if (!isTreatmentStatus(status)) return [];
    return [{ id, treatmentId, scheduledAt, status }];
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

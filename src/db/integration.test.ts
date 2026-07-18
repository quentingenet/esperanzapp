/**
 * Integration tests against a real in-memory SQLite database (sql.js asm.js build).
 *
 * These tests complement the lightweight mock-based unit tests in *.test.ts.
 * They target the DB layer (create, clear, runSchema) and the export/import round-trip,
 * catching bugs that mocks hide - in particular the changes.lastId unreliability on Android.
 *
 * Key guarantee: the sql.js connection intentionally omits lastId from run() results.
 * Any function that reads changes.lastId instead of using SELECT last_insert_rowid()
 * will throw "Failed to insert ..." here, making the regression immediately visible.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import {
  createInitializedSqliteConnection,
  type RealSqliteConn,
} from "@/test/realSqliteConnection";
import { createTreatment, updateTreatment, deleteTreatment } from "./treatments";
import { createPositiveHabit, updatePositiveHabit, deletePositiveHabit } from "./positiveHabits";
import {
  createHabit,
  createHabitLog,
  createTreatmentLog,
  createPositiveHabitLog,
} from "@/test/testHelpers";
import { clearAllData } from "./client";
import {
  buildExportPayload,
  parseExportPayload,
  payloadToCSV,
  parseCSVPayload,
  encryptPayload,
  decryptPayload,
} from "@/utils/exportSerialization";

// Helpers to query the real DB directly (bypassing module-level withDb).
async function countRows(conn: RealSqliteConn, table: string): Promise<number> {
  const r = await conn.query(`SELECT COUNT(*) as n FROM ${table}`);
  return (r.values[0] as { n: number } | undefined)?.n ?? 0;
}

async function allRows(conn: RealSqliteConn, table: string): Promise<Record<string, unknown>[]> {
  return (await conn.query(`SELECT * FROM ${table}`)).values;
}

// Fixture shared across tests - reset per test.
const HABIT_DATA = {
  label: "No-smoke",
  icon: "🚭",
  color: "#e53e3e",
  bgColor: "#fff5f5",
  startDate: "2024-01-01",
  createdAt: "2024-01-01T08:00:00Z",
};

const TREATMENT_DATA = {
  label: "Metformin",
  frequency: "daily" as const,
  reminderTime: "08:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T08:00:00Z",
};

const POSITIVE_HABIT_DATA = {
  label: "Course à pied",
  icon: "🏃",
  color: "#2e7d32",
  bgColor: "#e8f5e9",
  frequency: "daily" as const,
  reminderTime: "07:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T08:00:00Z",
};

// Cast RealSqliteConn to SQLiteDBConnection for functions that accept it.
function asConn(c: RealSqliteConn): SQLiteDBConnection {
  return c as unknown as SQLiteDBConnection;
}

describe("Integration - real SQLite (sql.js, no lastId in run())", () => {
  let conn: RealSqliteConn;

  beforeEach(async () => {
    conn = await createInitializedSqliteConnection();
  });

  afterEach(async () => {
    await conn.close();
  });

  // CRUD using the last_insert_rowid pattern

  it("createHabit returns a valid numeric id via last_insert_rowid", async () => {
    const habit = await createHabit(HABIT_DATA, asConn(conn));
    expect(+habit.id).toBeGreaterThan(0);
    expect(habit.label).toBe(HABIT_DATA.label);
    const rows = await allRows(conn, "habits");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe(HABIT_DATA.label);
  });

  it("createHabitLog returns a valid numeric id via last_insert_rowid", async () => {
    const habit = await createHabit(HABIT_DATA, asConn(conn));
    const log = await createHabitLog(
      { habitId: habit.id, eventType: "start", eventDate: "2024-01-01" },
      asConn(conn),
    );
    expect(+log.id).toBeGreaterThan(0);
    expect(log.habitId).toBe(habit.id);
    expect(await countRows(conn, "habit_logs")).toBe(1);
  });

  it("createTreatment returns a valid numeric id via last_insert_rowid", async () => {
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    expect(+treatment.id).toBeGreaterThan(0);
    expect(treatment.label).toBe(TREATMENT_DATA.label);
    expect(await countRows(conn, "treatments")).toBe(1);
  });

  it("createTreatmentLog returns a valid numeric id via last_insert_rowid", async () => {
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    const tlog = await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    expect(+tlog.id).toBeGreaterThan(0);
    expect(tlog.treatmentId).toBe(treatment.id);
    expect(await countRows(conn, "treatment_logs")).toBe(1);
  });

  it("createPositiveHabit returns a valid numeric id via last_insert_rowid", async () => {
    const habit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    expect(+habit.id).toBeGreaterThan(0);
    expect(habit.label).toBe(POSITIVE_HABIT_DATA.label);
    expect(await countRows(conn, "positive_habits")).toBe(1);
  });

  it("createPositiveHabitLog returns a valid numeric id via last_insert_rowid", async () => {
    const habit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    const log = await createPositiveHabitLog(
      { positiveHabitId: habit.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    expect(+log.id).toBeGreaterThan(0);
    expect(log.positiveHabitId).toBe(habit.id);
    expect(await countRows(conn, "positive_habit_logs")).toBe(1);
  });

  it("multiple inserts produce sequential distinct ids", async () => {
    const h1 = await createHabit(HABIT_DATA, asConn(conn));
    const h2 = await createHabit({ ...HABIT_DATA, label: "No-alcohol" }, asConn(conn));
    expect(h1.id).not.toBe(h2.id);
    expect(+h2.id).toBeGreaterThan(+h1.id);
  });

  // Native transaction API

  it("beginTransaction + commitTransaction persists data", async () => {
    await conn.beginTransaction();
    await createHabit(HABIT_DATA, asConn(conn));
    await conn.commitTransaction();
    expect(await countRows(conn, "habits")).toBe(1);
  });

  it("beginTransaction + rollbackTransaction leaves no data", async () => {
    await conn.beginTransaction();
    await createHabit(HABIT_DATA, asConn(conn));
    await conn.rollbackTransaction();
    expect(await countRows(conn, "habits")).toBe(0);
  });

  it("exception inside transaction triggers rollback - no partial data", async () => {
    await conn.beginTransaction();
    await expect(async () => {
      await createHabit(HABIT_DATA, asConn(conn));
      throw new Error("simulated failure");
    }).rejects.toThrow("simulated failure");
    await conn.rollbackTransaction();
    expect(await countRows(conn, "habits")).toBe(0);
  });

  // Data clearing

  it("clearAllData removes all rows from all tables", async () => {
    const habit = await createHabit(HABIT_DATA, asConn(conn));
    await createHabitLog(
      { habitId: habit.id, eventType: "start", eventDate: "2024-01-01" },
      asConn(conn),
    );
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    const positiveHabit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    await createPositiveHabitLog(
      { positiveHabitId: positiveHabit.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    await conn.run(
      "INSERT INTO positive_habit_milestone_notifications (positive_habit_id, threshold) VALUES (?, ?)",
      [Number(positiveHabit.id), 1],
    );

    await clearAllData(asConn(conn));

    expect(await countRows(conn, "habits")).toBe(0);
    expect(await countRows(conn, "habit_logs")).toBe(0);
    expect(await countRows(conn, "treatments")).toBe(0);
    expect(await countRows(conn, "treatment_logs")).toBe(0);
    expect(await countRows(conn, "positive_habits")).toBe(0);
    expect(await countRows(conn, "positive_habit_logs")).toBe(0);
    expect(await countRows(conn, "positive_habit_milestone_notifications")).toBe(0);
  });

  it("deletePositiveHabit removes the positive habit and all its logs and milestone notifications atomically", async () => {
    const habit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    await createPositiveHabitLog(
      { positiveHabitId: habit.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    await createPositiveHabitLog(
      { positiveHabitId: habit.id, scheduledAt: "2024-01-02", status: "missed" },
      asConn(conn),
    );
    await conn.run(
      "INSERT INTO positive_habit_milestone_notifications (positive_habit_id, threshold) VALUES (?, ?)",
      [Number(habit.id), 1],
    );

    expect(await countRows(conn, "positive_habits")).toBe(1);
    expect(await countRows(conn, "positive_habit_logs")).toBe(2);
    expect(await countRows(conn, "positive_habit_milestone_notifications")).toBe(1);

    await deletePositiveHabit(habit.id, asConn(conn));

    expect(await countRows(conn, "positive_habits")).toBe(0);
    expect(await countRows(conn, "positive_habit_logs")).toBe(0);
    expect(await countRows(conn, "positive_habit_milestone_notifications")).toBe(0);
  });

  it("deleteTreatment removes the treatment and all its logs atomically", async () => {
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-01-02", status: "missed" },
      asConn(conn),
    );

    expect(await countRows(conn, "treatments")).toBe(1);
    expect(await countRows(conn, "treatment_logs")).toBe(2);

    await deleteTreatment(treatment.id, asConn(conn));

    expect(await countRows(conn, "treatments")).toBe(0);
    expect(await countRows(conn, "treatment_logs")).toBe(0);
  });

  // Database constraints

  it("UNIQUE index rejects duplicate treatment_log for same (treatment_id, scheduled_at)", async () => {
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    await expect(
      createTreatmentLog(
        { treatmentId: treatment.id, scheduledAt: "2024-01-01", status: "missed" },
        asConn(conn),
      ),
    ).rejects.toThrow();
  });

  it("FK constraint rejects habit_log with unknown habit_id", async () => {
    await expect(
      createHabitLog(
        { habitId: "99999", eventType: "start", eventDate: "2024-01-01" },
        asConn(conn),
      ),
    ).rejects.toThrow();
  });

  it("FK constraint rejects treatment_log with unknown treatment_id", async () => {
    await expect(
      createTreatmentLog(
        { treatmentId: "99999", scheduledAt: "2024-01-01", status: "taken" },
        asConn(conn),
      ),
    ).rejects.toThrow();
  });

  it("UNIQUE index rejects duplicate positive_habit_log for same (positive_habit_id, scheduled_at)", async () => {
    const habit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    await createPositiveHabitLog(
      { positiveHabitId: habit.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    await expect(
      createPositiveHabitLog(
        { positiveHabitId: habit.id, scheduledAt: "2024-01-01", status: "missed" },
        asConn(conn),
      ),
    ).rejects.toThrow();
  });

  it("FK constraint rejects positive_habit_log with unknown positive_habit_id", async () => {
    await expect(
      createPositiveHabitLog(
        { positiveHabitId: "99999", scheduledAt: "2024-01-01", status: "taken" },
        asConn(conn),
      ),
    ).rejects.toThrow();
  });

  it("FK constraint rejects a milestone notification row with unknown positive_habit_id", async () => {
    await expect(
      conn.run(
        "INSERT INTO positive_habit_milestone_notifications (positive_habit_id, threshold) VALUES (?, ?)",
        [99999, 1],
      ),
    ).rejects.toThrow();
  });

  it("PRIMARY KEY on (positive_habit_id, threshold) silently ignores a duplicate insert", async () => {
    const habit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    const insert = () =>
      conn.run(
        "INSERT OR IGNORE INTO positive_habit_milestone_notifications (positive_habit_id, threshold) VALUES (?, ?)",
        [Number(habit.id), 1],
      );
    await insert();
    await expect(insert()).resolves.toBeDefined();
    expect(await countRows(conn, "positive_habit_milestone_notifications")).toBe(1);
  });

  // reminder_day CHECK constraint — weekly/monthly with reminderEnabled=false

  it("createTreatment weekly with reminderEnabled=false keeps valid reminderDay", async () => {
    const treatment = await createTreatment(
      {
        label: "Aspirin",
        frequency: "weekly",
        reminderTime: "08:00",
        reminderEnabled: false,
        reminderDay: 1,
        createdAt: "2024-01-01T08:00:00Z",
      },
      asConn(conn),
    );
    expect(+treatment.id).toBeGreaterThan(0);
    const rows = await allRows(conn, "treatments");
    expect(rows[0]?.reminder_day).toBe(1);
    expect(rows[0]?.reminder_enabled).toBe(0);
  });

  it("createTreatment monthly with reminderEnabled=false keeps valid reminderDay", async () => {
    const treatment = await createTreatment(
      {
        label: "Metformin",
        frequency: "monthly",
        reminderTime: "08:00",
        reminderEnabled: false,
        reminderDay: 15,
        createdAt: "2024-01-01T08:00:00Z",
      },
      asConn(conn),
    );
    expect(+treatment.id).toBeGreaterThan(0);
    const rows = await allRows(conn, "treatments");
    expect(rows[0]?.reminder_day).toBe(15);
  });

  it("createPositiveHabit weekly with reminderEnabled=false keeps valid reminderDay", async () => {
    const habit = await createPositiveHabit(
      { ...POSITIVE_HABIT_DATA, frequency: "weekly", reminderEnabled: false, reminderDay: 2 },
      asConn(conn),
    );
    expect(+habit.id).toBeGreaterThan(0);
    const rows = await allRows(conn, "positive_habits");
    expect(rows[0]?.reminder_day).toBe(2);
    expect(rows[0]?.reminder_enabled).toBe(0);
  });

  it("updateTreatment disabling reminder on weekly treatment preserves reminderDay", async () => {
    const treatment = await createTreatment(
      {
        label: "Aspirin",
        frequency: "weekly",
        reminderTime: "08:00",
        reminderEnabled: true,
        reminderDay: 3,
        createdAt: "2024-01-01T08:00:00Z",
      },
      asConn(conn),
    );
    await updateTreatment(treatment.id, { reminderEnabled: false }, asConn(conn));
    const rows = await allRows(conn, "treatments");
    expect(rows[0]?.reminder_enabled).toBe(0);
    expect(rows[0]?.reminder_day).toBe(3);
  });

  it("a freshly created positive habit defaults to is_custom=1 and can be renamed", async () => {
    const habit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    const before = await allRows(conn, "positive_habits");
    expect(before[0]?.is_custom).toBe(1);
    await updatePositiveHabit(habit.id, { label: "Course du matin" }, asConn(conn));
    const rows = await allRows(conn, "positive_habits");
    expect(rows[0]?.label).toBe("Course du matin");
  });

  it("updatePositiveHabit rejects renaming a non-custom (preset) positive habit", async () => {
    const habit = await createPositiveHabit(
      { ...POSITIVE_HABIT_DATA, isCustom: false },
      asConn(conn),
    );
    const before = await allRows(conn, "positive_habits");
    expect(before[0]?.is_custom).toBe(0);
    await expect(
      updatePositiveHabit(habit.id, { label: "Nouveau nom" }, asConn(conn)),
    ).rejects.toThrow("updatePositiveHabit: cannot rename a non-custom habit");
    const rows = await allRows(conn, "positive_habits");
    expect(rows[0]?.label).toBe(POSITIVE_HABIT_DATA.label);
  });

  it("updatePositiveHabit still allows editing the reminder on a non-custom habit", async () => {
    const habit = await createPositiveHabit(
      { ...POSITIVE_HABIT_DATA, isCustom: false },
      asConn(conn),
    );
    await updatePositiveHabit(habit.id, { reminderEnabled: false }, asConn(conn));
    const rows = await allRows(conn, "positive_habits");
    expect(rows[0]?.reminder_enabled).toBe(0);
  });

  // JSON export and import round trip
  // Uses direct INSERT with original IDs, exactly as exportService.importPayload.
  // This approach requires no last_insert_rowid() and no ID remapping.

  async function importDirectly(
    conn: RealSqliteConn,
    payload: ReturnType<typeof parseExportPayload>,
  ): Promise<void> {
    for (const [index, h] of payload.habits.entries()) {
      await conn.run(
        "INSERT INTO habits (id, label, icon, color, bg_color, start_date, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [h.id, h.label, h.icon, h.color, h.bgColor, h.startDate, h.createdAt, index],
      );
    }
    for (const l of payload.habitLogs) {
      await conn.run(
        "INSERT INTO habit_logs (id, habit_id, event_type, event_date) VALUES (?, ?, ?, ?)",
        [l.id, l.habitId, l.eventType, l.eventDate],
      );
    }
    for (const [index, t] of payload.treatments.entries()) {
      await conn.run(
        "INSERT INTO treatments (id, label, frequency, reminder_time, reminder_enabled, reminder_day, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          t.id,
          t.label,
          t.frequency,
          t.reminderTime,
          t.reminderEnabled ? 1 : 0,
          t.reminderDay ?? null,
          t.createdAt,
          index,
        ],
      );
    }
    for (const tl of payload.treatmentLogs) {
      await conn.run(
        "INSERT INTO treatment_logs (id, treatment_id, scheduled_at, status) VALUES (?, ?, ?, ?)",
        [tl.id, tl.treatmentId, tl.scheduledAt, tl.status],
      );
    }
    for (const [index, h] of payload.positiveHabits.entries()) {
      await conn.run(
        "INSERT INTO positive_habits (id, label, icon, color, bg_color, frequency, reminder_time, reminder_enabled, reminder_day, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          h.id,
          h.label,
          h.icon,
          h.color,
          h.bgColor,
          h.frequency,
          h.reminderTime,
          h.reminderEnabled ? 1 : 0,
          h.reminderDay ?? null,
          h.createdAt,
          index,
        ],
      );
    }
    for (const phl of payload.positiveHabitLogs) {
      await conn.run(
        "INSERT INTO positive_habit_logs (id, positive_habit_id, scheduled_at, status) VALUES (?, ?, ?, ?)",
        [phl.id, phl.positiveHabitId, phl.scheduledAt, phl.status],
      );
    }
  }

  it("JSON round-trip preserves habits, habitLogs, treatments, treatmentLogs, positiveHabits, positiveHabitLogs", async () => {
    // Create fixture data using create* functions (tests last_insert_rowid path).
    const habit = await createHabit(HABIT_DATA, asConn(conn));
    const log1 = await createHabitLog(
      { habitId: habit.id, eventType: "start", eventDate: "2024-01-01" },
      asConn(conn),
    );
    const log2 = await createHabitLog(
      { habitId: habit.id, eventType: "relapse", eventDate: "2024-06-15" },
      asConn(conn),
    );
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    const tlog = await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );
    const positiveHabit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    const phlog = await createPositiveHabitLog(
      { positiveHabitId: positiveHabit.id, scheduledAt: "2024-01-01", status: "taken" },
      asConn(conn),
    );

    // Export to JSON.
    const payload = buildExportPayload(
      [habit],
      [log1, log2],
      [treatment],
      [tlog],
      new Date().toISOString(),
      [positiveHabit],
      [phlog],
    );
    const json = JSON.stringify(payload, null, 2);

    // Clear and re-import using direct INSERT with original IDs.
    await clearAllData(asConn(conn));
    expect(await countRows(conn, "habits")).toBe(0);

    await importDirectly(conn, parseExportPayload(json));

    // Verify counts.
    expect(await countRows(conn, "habits")).toBe(1);
    expect(await countRows(conn, "habit_logs")).toBe(2);
    expect(await countRows(conn, "treatments")).toBe(1);
    expect(await countRows(conn, "treatment_logs")).toBe(1);
    expect(await countRows(conn, "positive_habits")).toBe(1);
    expect(await countRows(conn, "positive_habit_logs")).toBe(1);

    // Verify content and FK integrity (original IDs preserved).
    const habitRows = await allRows(conn, "habits");
    expect(habitRows[0]?.id).toBe(Number(habit.id));
    expect(habitRows[0]?.label).toBe(HABIT_DATA.label);

    const treatmentRows = await allRows(conn, "treatments");
    expect(treatmentRows[0]?.label).toBe(TREATMENT_DATA.label);

    const logRows = await allRows(conn, "habit_logs");
    expect(logRows.map((r) => r.event_type).sort()).toEqual(["relapse", "start"]);
    // FK integrity: all logs point to the re-imported habit id.
    expect(logRows.every((r) => r.habit_id === Number(habit.id))).toBe(true);

    const tlogRows = await allRows(conn, "treatment_logs");
    expect(tlogRows[0]?.status).toBe("taken");
    expect(tlogRows[0]?.treatment_id).toBe(Number(treatment.id));

    const positiveHabitRows = await allRows(conn, "positive_habits");
    expect(positiveHabitRows[0]?.label).toBe(POSITIVE_HABIT_DATA.label);
    expect(positiveHabitRows[0]?.icon).toBe(POSITIVE_HABIT_DATA.icon);

    const phlogRows = await allRows(conn, "positive_habit_logs");
    expect(phlogRows[0]?.status).toBe("taken");
    expect(phlogRows[0]?.positive_habit_id).toBe(Number(positiveHabit.id));
  });

  // CSV export and import round trip

  it("CSV round-trip preserves all entities", async () => {
    const habit = await createHabit(HABIT_DATA, asConn(conn));
    const log = await createHabitLog(
      { habitId: habit.id, eventType: "start", eventDate: "2024-01-01" },
      asConn(conn),
    );
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    const tlog = await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-01-01", status: "missed" },
      asConn(conn),
    );
    const positiveHabit = await createPositiveHabit(POSITIVE_HABIT_DATA, asConn(conn));
    const phlog = await createPositiveHabitLog(
      { positiveHabitId: positiveHabit.id, scheduledAt: "2024-01-01", status: "pending" },
      asConn(conn),
    );

    const csv = payloadToCSV(
      buildExportPayload(
        [habit],
        [log],
        [treatment],
        [tlog],
        new Date().toISOString(),
        [positiveHabit],
        [phlog],
      ),
    );
    await clearAllData(asConn(conn));
    await importDirectly(conn, parseCSVPayload(csv));

    expect(await countRows(conn, "habits")).toBe(1);
    expect(await countRows(conn, "habit_logs")).toBe(1);
    expect(await countRows(conn, "treatments")).toBe(1);
    expect(await countRows(conn, "treatment_logs")).toBe(1);
    expect(await countRows(conn, "positive_habits")).toBe(1);
    expect(await countRows(conn, "positive_habit_logs")).toBe(1);

    const tlogRows = await allRows(conn, "treatment_logs");
    expect(tlogRows[0]?.status).toBe("missed");
    // FK integrity preserved via original IDs.
    expect(tlogRows[0]?.treatment_id).toBe(Number(treatment.id));

    const phlogRows = await allRows(conn, "positive_habit_logs");
    expect(phlogRows[0]?.status).toBe("pending");
    expect(phlogRows[0]?.positive_habit_id).toBe(Number(positiveHabit.id));
  });

  // Sort order preservation across export/import

  it("import preserves custom sort order for habits and treatments", async () => {
    const habitA = await createHabit(
      { ...HABIT_DATA, label: "Habit-A", createdAt: "2024-01-01T01:00:00Z" },
      asConn(conn),
    );
    const habitB = await createHabit(
      { ...HABIT_DATA, label: "Habit-B", createdAt: "2024-01-01T02:00:00Z" },
      asConn(conn),
    );
    const habitC = await createHabit(
      { ...HABIT_DATA, label: "Habit-C", createdAt: "2024-01-01T03:00:00Z" },
      asConn(conn),
    );
    const treatA = await createTreatment(
      { ...TREATMENT_DATA, label: "Treat-A", createdAt: "2024-01-01T01:00:00Z" },
      asConn(conn),
    );
    const treatB = await createTreatment(
      { ...TREATMENT_DATA, label: "Treat-B", createdAt: "2024-01-01T02:00:00Z" },
      asConn(conn),
    );

    // Set custom order: B(0) C(1) A(2) for habits, B(0) A(1) for treatments
    await conn.run("UPDATE habits SET sort_index = ? WHERE id = ?", [0, habitB.id]);
    await conn.run("UPDATE habits SET sort_index = ? WHERE id = ?", [1, habitC.id]);
    await conn.run("UPDATE habits SET sort_index = ? WHERE id = ?", [2, habitA.id]);
    await conn.run("UPDATE treatments SET sort_index = ? WHERE id = ?", [0, treatB.id]);
    await conn.run("UPDATE treatments SET sort_index = ? WHERE id = ?", [1, treatA.id]);

    // Export in custom order (caller is responsible for passing them sorted)
    const payload = buildExportPayload(
      [habitB, habitC, habitA],
      [],
      [treatB, treatA],
      [],
      new Date().toISOString(),
    );

    await clearAllData(asConn(conn));
    await importDirectly(conn, parseExportPayload(JSON.stringify(payload)));

    const habitRows = await conn.query(
      "SELECT label FROM habits ORDER BY sort_index ASC, created_at ASC",
    );
    expect(habitRows.values.map((r: unknown) => (r as { label: string }).label)).toEqual([
      "Habit-B",
      "Habit-C",
      "Habit-A",
    ]);

    const treatRows = await conn.query(
      "SELECT label FROM treatments ORDER BY sort_index ASC, created_at ASC",
    );
    expect(treatRows.values.map((r: unknown) => (r as { label: string }).label)).toEqual([
      "Treat-B",
      "Treat-A",
    ]);
  });

  it("import preserves custom sort order for positive habits", async () => {
    const phA = await createPositiveHabit(
      { ...POSITIVE_HABIT_DATA, label: "PH-A", createdAt: "2024-01-01T01:00:00Z" },
      asConn(conn),
    );
    const phB = await createPositiveHabit(
      { ...POSITIVE_HABIT_DATA, label: "PH-B", createdAt: "2024-01-01T02:00:00Z" },
      asConn(conn),
    );

    await conn.run("UPDATE positive_habits SET sort_index = ? WHERE id = ?", [0, phB.id]);
    await conn.run("UPDATE positive_habits SET sort_index = ? WHERE id = ?", [1, phA.id]);

    const payload = buildExportPayload([], [], [], [], new Date().toISOString(), [phB, phA], []);

    await clearAllData(asConn(conn));
    await importDirectly(conn, parseExportPayload(JSON.stringify(payload)));

    const rows = await conn.query(
      "SELECT label FROM positive_habits ORDER BY sort_index ASC, created_at ASC",
    );
    expect(rows.values.map((r: unknown) => (r as { label: string }).label)).toEqual([
      "PH-B",
      "PH-A",
    ]);
  });

  // Encrypted JSON round trip

  it("encrypted round-trip: encrypt then decrypt recovers original payload", async () => {
    const habit = await createHabit(HABIT_DATA, asConn(conn));
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn));
    const tlog = await createTreatmentLog(
      { treatmentId: treatment.id, scheduledAt: "2024-02-01", status: "pending" },
      asConn(conn),
    );

    const payload = buildExportPayload([habit], [], [treatment], [tlog], new Date().toISOString());
    const serialized = JSON.stringify(payload, null, 2);
    const password = "str0ng-test-password";

    const encrypted = await encryptPayload(serialized, password, "json");
    const { content, format } = await decryptPayload(encrypted, password);

    expect(format).toBe("json");
    const recovered = parseExportPayload(content);
    expect(recovered.habits).toHaveLength(1);
    expect(recovered.habits[0]?.label).toBe(HABIT_DATA.label);
    expect(recovered.treatments).toHaveLength(1);
    expect(recovered.treatments[0]?.label).toBe(TREATMENT_DATA.label);
    expect(recovered.treatmentLogs).toHaveLength(1);
    expect(recovered.treatmentLogs[0]?.status).toBe("pending");
  });

  it("decryptPayload throws WrongPasswordError on wrong password", async () => {
    const payload = buildExportPayload([], [], [], [], new Date().toISOString());
    const encrypted = await encryptPayload(JSON.stringify(payload), "correct-pass", "json");
    const { WrongPasswordError } = await import("@/utils/exportSerialization");
    await expect(decryptPayload(encrypted, "wrong-pass")).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });

  // reminder_day = null preserved across JSON round-trip (daily treatment)

  it("daily treatment JSON round-trip preserves reminder_day = null in DB", async () => {
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn)); // daily, reminderDay: null
    const payload = buildExportPayload([], [], [treatment], [], new Date().toISOString());
    await clearAllData(asConn(conn));
    await importDirectly(conn, parseExportPayload(JSON.stringify(payload)));
    const rows = await allRows(conn, "treatments");
    expect(rows[0]?.frequency).toBe("daily");
    expect(rows[0]?.reminder_day).toBeNull();
  });

  // clearAllData atomicity: mid-import failure rolls back to original state

  it("failed import inside transaction restores original data (no partial state)", async () => {
    const habit = await createHabit(HABIT_DATA, asConn(conn));
    await createHabitLog(
      { habitId: habit.id, eventType: "start", eventDate: "2024-01-01" },
      asConn(conn),
    );

    // Simulate importPayload: begin → clear → insert good → insert bad → rollback
    await conn.beginTransaction();
    try {
      await clearAllData(asConn(conn));
      await conn.run(
        "INSERT INTO habits (id, label, icon, color, bg_color, start_date, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["42", "NewHabit", "🎯", "#000", "#fff", "2024-06-01", "2024-06-01T00:00:00Z", 0],
      );
      // FK violation: habit_id 99999 does not exist → throws
      await conn.run(
        "INSERT INTO habit_logs (id, habit_id, event_type, event_date) VALUES (?, ?, ?, ?)",
        ["99", "99999", "start", "2024-06-01"],
      );
      await conn.commitTransaction();
    } catch {
      await conn.rollbackTransaction();
    }

    // Rollback restores original data — no partial import persisted
    expect(await countRows(conn, "habits")).toBe(1);
    expect((await allRows(conn, "habits"))[0]?.label).toBe(HABIT_DATA.label);
    expect(await countRows(conn, "habit_logs")).toBe(1);
  });

  // updateTreatment frequency change + reminderDay recalculated

  it("updateTreatment frequency change daily→weekly enforces reminderDay invariant", async () => {
    const treatment = await createTreatment(TREATMENT_DATA, asConn(conn)); // daily, reminderDay: null

    // daily → weekly with valid reminderDay=1
    await updateTreatment(treatment.id, { frequency: "weekly", reminderDay: 1 }, asConn(conn));
    const rows = await allRows(conn, "treatments");
    expect(rows[0]?.frequency).toBe("weekly");
    expect(rows[0]?.reminder_day).toBe(1);

    // weekly → daily with null (valid)
    await updateTreatment(treatment.id, { frequency: "daily", reminderDay: null }, asConn(conn));
    const rows2 = await allRows(conn, "treatments");
    expect(rows2[0]?.frequency).toBe("daily");
    expect(rows2[0]?.reminder_day).toBeNull();

    // daily → weekly without reminderDay → application rejects (invariant violation)
    await expect(
      updateTreatment(treatment.id, { frequency: "weekly" }, asConn(conn)),
    ).rejects.toThrow("weekly must have reminderDay");
  });
});

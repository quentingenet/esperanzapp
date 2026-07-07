import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSchema } from "./schema";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";

function makeDb(migrationApplied = false) {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue({ changes: { lastId: 1 } }),
    query: vi.fn().mockResolvedValue({ values: migrationApplied ? [{ "1": 1 }] : [] }),
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    rollbackTransaction: vi.fn().mockResolvedValue(undefined),
  } as unknown as SQLiteDBConnection;
}

function executedSql(db: SQLiteDBConnection): string[] {
  return vi.mocked(db.execute).mock.calls.map((c) => c[0]);
}

describe("runSchema", () => {
  it("executes the full CREATE TABLE schema on fresh install", async () => {
    const db = makeDb(false);
    await runSchema(db);
    const sqls = executedSql(db);
    expect(sqls[0]).toContain("CREATE TABLE IF NOT EXISTS schema_migrations");
    expect(sqls[0]).toContain("CREATE TABLE IF NOT EXISTS habits");
    expect(sqls[0]).toContain("CREATE TABLE IF NOT EXISTS treatments");
    expect(sqls[0]).toContain("CREATE TABLE IF NOT EXISTS treatment_logs");
  });

  it("applies dedup migration when not previously applied", async () => {
    const db = makeDb(false);
    await runSchema(db);
    const dedup = executedSql(db).find((s) => s.includes("DELETE FROM treatment_logs"));
    expect(dedup).toBeDefined();
    expect(dedup).toContain("CASE t2.status WHEN 'taken' THEN 0");
  });

  it("skips dedup migration when already applied", async () => {
    const db = makeDb(true);
    await runSchema(db);
    const dedup = executedSql(db).find((s) => s.includes("DELETE FROM treatment_logs"));
    expect(dedup).toBeUndefined();
  });

  it("marks dedup migration as applied after running it", async () => {
    const db = makeDb(false);
    await runSchema(db);
    const calls = vi.mocked(db.run).mock.calls;
    const marked = calls.some(
      (c) =>
        c[0].includes("INSERT OR IGNORE INTO schema_migrations") &&
        Array.isArray(c[1]) &&
        c[1].includes("dedup_treatment_logs_v2"),
    );
    expect(marked).toBe(true);
  });

  it("applies habit_log index migration when not applied", async () => {
    const db = makeDb(false);
    await runSchema(db);
    expect(executedSql(db).some((s) => s.includes("idx_habit_logs_habit_id"))).toBe(true);
  });

  it("skips habit_log index migration when already applied", async () => {
    const db = makeDb(true);
    await runSchema(db);
    expect(executedSql(db).find((s) => s.includes("idx_habit_logs_habit_id"))).toBeUndefined();
  });

  it("propagates migration errors instead of swallowing them", async () => {
    const db = makeDb(false);
    // First call (SCHEMA creation) succeeds; second call (dedup DELETE) rejects.
    vi.mocked(db.execute)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("constraint violation"));
    vi.mocked(db.query).mockResolvedValue({ values: [] }); // migration not applied
    await expect(runSchema(db)).rejects.toThrow("constraint violation");
  });
});

describe("treatments_reminder_day_check migration", () => {
  it("wraps table rebuild in a transaction", async () => {
    const db = makeDb(false);
    await runSchema(db);
    expect(vi.mocked(db.beginTransaction)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.commitTransaction)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.rollbackTransaction)).not.toHaveBeenCalled();
  });

  it("drops treatments_new before starting to clean up any previous partial run", async () => {
    const db = makeDb(false);
    await runSchema(db);
    const sqls = executedSql(db);
    const dropNewIdx = sqls.findIndex((s) => s.includes("DROP TABLE IF EXISTS treatments_new"));
    const beginIdx = sqls.findIndex((s) => s.includes("PRAGMA foreign_keys = OFF"));
    expect(dropNewIdx).toBeGreaterThanOrEqual(0);
    expect(dropNewIdx).toBeLessThan(beginIdx);
  });

  it("sets PRAGMA foreign_keys OFF before transaction and ON after commit", async () => {
    const db = makeDb(false);
    await runSchema(db);
    const sqls = executedSql(db);
    expect(sqls.some((s) => s.includes("PRAGMA foreign_keys = OFF"))).toBe(true);
    expect(sqls.some((s) => s.includes("PRAGMA foreign_keys = ON"))).toBe(true);
  });

  it("rollbacks and re-enables foreign keys when DDL fails", async () => {
    const db = makeDb(false);
    let callCount = 0;
    vi.mocked(db.execute).mockImplementation(async (sql) => {
      if (sql.includes("CREATE TABLE treatments_new")) {
        callCount++;
        if (callCount === 1) throw new Error("disk full");
      }
      return {};
    });
    await expect(runSchema(db)).rejects.toThrow("disk full");
    expect(vi.mocked(db.rollbackTransaction)).toHaveBeenCalledTimes(1);
    expect(executedSql(db).some((s) => s.includes("PRAGMA foreign_keys = ON"))).toBe(true);
  });

  it("skips table rebuild when already applied", async () => {
    const db = makeDb(true);
    await runSchema(db);
    expect(executedSql(db).some((s) => s.includes("treatments_new"))).toBe(false);
    expect(vi.mocked(db.beginTransaction)).not.toHaveBeenCalled();
  });

  it("marks the migration as applied after commit", async () => {
    const db = makeDb(false);
    await runSchema(db);
    const marked = vi.mocked(db.run).mock.calls.some(
      (c) =>
        c[0].includes("INSERT OR IGNORE INTO schema_migrations") &&
        Array.isArray(c[1]) &&
        c[1].includes("treatments_reminder_day_check"),
    );
    expect(marked).toBe(true);
  });
});

describe("reminder_day sanitization logic", () => {
  type Row = { frequency: "daily" | "weekly" | "monthly"; reminder_day: number | null };

  function sanitize(row: Row): number | null {
    if (row.frequency === "daily") return null;
    if (row.frequency === "weekly") {
      return row.reminder_day !== null && row.reminder_day >= 0 && row.reminder_day <= 6
        ? row.reminder_day
        : 1;
    }
    if (row.reminder_day === 0 || (row.reminder_day !== null && row.reminder_day >= 1 && row.reminder_day <= 28)) {
      return row.reminder_day;
    }
    return 1;
  }

  beforeEach(() => vi.clearAllMocks());

  it("forces reminder_day to null for daily treatments", () => {
    expect(sanitize({ frequency: "daily", reminder_day: 3 })).toBeNull();
    expect(sanitize({ frequency: "daily", reminder_day: null })).toBeNull();
  });

  it("keeps valid weekly reminder_day (0 to 6)", () => {
    expect(sanitize({ frequency: "weekly", reminder_day: 0 })).toBe(0);
    expect(sanitize({ frequency: "weekly", reminder_day: 6 })).toBe(6);
  });

  it("corrects invalid weekly reminder_day to 1", () => {
    expect(sanitize({ frequency: "weekly", reminder_day: null })).toBe(1);
    expect(sanitize({ frequency: "weekly", reminder_day: 7 })).toBe(1);
  });

  it("keeps valid monthly reminder_day (0 or 1 to 28)", () => {
    expect(sanitize({ frequency: "monthly", reminder_day: 0 })).toBe(0);
    expect(sanitize({ frequency: "monthly", reminder_day: 1 })).toBe(1);
    expect(sanitize({ frequency: "monthly", reminder_day: 28 })).toBe(28);
  });

  it("corrects out-of-range monthly reminder_day to 1", () => {
    expect(sanitize({ frequency: "monthly", reminder_day: null })).toBe(1);
    expect(sanitize({ frequency: "monthly", reminder_day: 29 })).toBe(1);
    expect(sanitize({ frequency: "monthly", reminder_day: 31 })).toBe(1);
  });
});

describe("dedup rule logic", () => {
  type Row = { id: number; treatment_id: number; scheduled_at: string; status: "taken" | "missed" | "pending" };

  function priority(s: string): number {
    return s === "taken" ? 0 : s === "missed" ? 1 : 2;
  }

  function simulateDedup(rows: Row[]): number[] {
    return rows
      .filter(
        (tl) =>
          !rows.some(
            (t2) =>
              t2.treatment_id === tl.treatment_id &&
              t2.scheduled_at === tl.scheduled_at &&
              (priority(t2.status) < priority(tl.status) ||
                (t2.status === tl.status && t2.id > tl.id)),
          ),
      )
      .map((r) => r.id);
  }

  beforeEach(() => vi.clearAllMocks());

  it("keeps taken over missed and pending on the same key", () => {
    const rows: Row[] = [
      { id: 1, treatment_id: 1, scheduled_at: "2024-01-01", status: "pending" },
      { id: 2, treatment_id: 1, scheduled_at: "2024-01-01", status: "missed" },
      { id: 3, treatment_id: 1, scheduled_at: "2024-01-01", status: "taken" },
    ];
    expect(simulateDedup(rows)).toEqual([3]);
  });

  it("keeps missed over pending when taken is absent", () => {
    const rows: Row[] = [
      { id: 1, treatment_id: 1, scheduled_at: "2024-01-01", status: "pending" },
      { id: 2, treatment_id: 1, scheduled_at: "2024-01-01", status: "missed" },
    ];
    expect(simulateDedup(rows)).toEqual([2]);
  });

  it("keeps newest (highest id) when statuses are equal", () => {
    const rows: Row[] = [
      { id: 1, treatment_id: 1, scheduled_at: "2024-01-01", status: "pending" },
      { id: 5, treatment_id: 1, scheduled_at: "2024-01-01", status: "pending" },
      { id: 3, treatment_id: 1, scheduled_at: "2024-01-01", status: "pending" },
    ];
    expect(simulateDedup(rows)).toEqual([5]);
  });

  it("keeps entries from different dates independently", () => {
    const rows: Row[] = [
      { id: 1, treatment_id: 1, scheduled_at: "2024-01-01", status: "missed" },
      { id: 2, treatment_id: 1, scheduled_at: "2024-01-01", status: "taken" },
      { id: 3, treatment_id: 1, scheduled_at: "2024-01-02", status: "pending" },
    ];
    const kept = simulateDedup(rows);
    expect(kept).toContain(2);
    expect(kept).toContain(3);
    expect(kept).not.toContain(1);
  });
});

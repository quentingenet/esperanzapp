import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSchema } from "./schema";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";

function makeDb(migrationApplied = false) {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue({ changes: { lastId: 1 } }),
    query: vi.fn().mockResolvedValue({ values: migrationApplied ? [{ "1": 1 }] : [] }),
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

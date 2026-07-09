/**
 * Recovery integration tests.
 *
 * Test 1 — treatments_backup residual (src/db/schema.ts:151-161):
 * Simulates a crash that left treatments_backup on disk after DROP TABLE
 * treatments ran but before treatments_new was renamed. Verifies that the
 * next call to runSchema restores the data and drops the backup.
 *
 * Test 2 — encryption key bootstrap (src/db/client.ts:41-44):
 * Verifies that when no encryption secret is stored (first install),
 * a 256-bit hex key is generated and handed to setEncryptionSecret.
 */
import { describe, it, expect, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { SQLiteConnection } from "@capacitor-community/sqlite";
import { createRealSqliteConnection } from "./realSqliteConnection";
import { runSchema } from "@/db/schema";

const PRE_MIGRATION_NAMES = [
  "dedup_treatment_logs_v2",
  "idx_habit_logs_habit_id",
  "idx_treatment_logs_scheduled_at",
  "sort_index_habits",
  "sort_index_treatments",
];

describe("Schema recovery: treatments_backup residual", () => {
  it("restores treatments from backup and drops it when runSchema finds a residual backup", async () => {
    const conn = await createRealSqliteConnection();

    // Build the post-crash DB state:
    //   - All migrations except treatments_reminder_day_check are applied.
    //   - treatments_backup exists (snapshot created before DROP TABLE treatments).
    //   - treatments is empty (as SCHEMA's IF NOT EXISTS recreates it after crash).
    await conn.execute(`
      CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE onboarding (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, icon TEXT NOT NULL,
        color TEXT NOT NULL, bg_color TEXT NOT NULL, start_date TEXT NOT NULL,
        created_at TEXT NOT NULL, sort_index INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, habit_id INTEGER NOT NULL REFERENCES habits(id),
        event_type TEXT NOT NULL, event_date TEXT NOT NULL
      );
      CREATE TABLE treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL,
        frequency TEXT NOT NULL, reminder_time TEXT NOT NULL DEFAULT '08:00',
        reminder_enabled INTEGER NOT NULL DEFAULT 1, reminder_day INTEGER DEFAULT NULL,
        created_at TEXT NOT NULL, sort_index INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE treatment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, treatment_id INTEGER NOT NULL REFERENCES treatments(id),
        scheduled_at TEXT NOT NULL, status TEXT NOT NULL
      );
    `);

    for (const name of PRE_MIGRATION_NAMES) {
      await conn.run("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)", [
        name,
        "2025-01-01T00:00:00.000Z",
      ]);
    }

    // This row must survive the crash and be visible after recovery.
    await conn.run(
      "INSERT INTO treatments (label, frequency, reminder_time, reminder_enabled, reminder_day, created_at, sort_index) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["Morning pill", "daily", "08:00", 1, null, "2025-01-01T00:00:00.000Z", 0],
    );

    // Simulate the crash sequence:
    //   1. treatments_backup snapshot was created
    //   2. DROP TABLE treatments executed
    //   3. Process died before treatments_new was renamed to treatments
    // On next boot, SCHEMA's "CREATE TABLE IF NOT EXISTS treatments" recreates an empty table.
    await conn.execute("CREATE TABLE treatments_backup AS SELECT * FROM treatments");
    await conn.execute("DROP TABLE treatments");
    await conn.execute(`
      CREATE TABLE treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL,
        frequency TEXT NOT NULL, reminder_time TEXT NOT NULL DEFAULT '08:00',
        reminder_enabled INTEGER NOT NULL DEFAULT 1, reminder_day INTEGER DEFAULT NULL,
        created_at TEXT NOT NULL, sort_index INTEGER NOT NULL DEFAULT 0
      )
    `);

    const preRecovery = await conn.query("SELECT * FROM treatments");
    expect(preRecovery.values).toHaveLength(0);

    // Simulates the next app boot — triggers the recovery branch.
    await runSchema(conn as never);

    const afterRecovery = await conn.query("SELECT * FROM treatments");
    expect(afterRecovery.values).toHaveLength(1);
    expect(afterRecovery.values[0]).toMatchObject({ label: "Morning pill" });

    const backupGone = await conn.query(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='treatments_backup'",
    );
    expect(backupGone.values).toHaveLength(0);

    await conn.close();
  });
});

describe("DB client: encryption key bootstrap", () => {
  it("generates a 256-bit hex key and stores it when no secret is present", async () => {
    let capturedKey: string | undefined;

    // The mock functions are NOT isolated by vi.isolateModules (Vitest design):
    // the same vi.fn() instances are visible in and out of the isolated scope.
    // mockImplementationOnce is therefore consumed by the new SQLiteConnection()
    // call inside the freshly-evaluated @/db/client module.
    vi.mocked(Capacitor.getPlatform).mockReturnValueOnce("android");
    vi.mocked(SQLiteConnection).mockImplementationOnce(function () {
      return {
        isSecretStored: vi.fn().mockResolvedValue({ result: false }),
        setEncryptionSecret: vi.fn().mockImplementation((key: string) => {
          capturedKey = key;
          return Promise.resolve();
        }),
        isConnection: vi.fn().mockResolvedValue({ result: false }),
        createConnection: vi.fn().mockResolvedValue({
          open: vi.fn().mockResolvedValue(undefined),
          execute: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
          run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
          query: vi.fn().mockResolvedValue({ values: [] }),
          beginTransaction: vi.fn().mockResolvedValue({}),
          commitTransaction: vi.fn().mockResolvedValue({}),
          rollbackTransaction: vi.fn().mockResolvedValue({}),
        }),
        closeConnection: vi.fn().mockResolvedValue(undefined),
        initWebStore: vi.fn().mockResolvedValue(undefined),
      };
    });

    // @/db/client is not imported at the top of this test file.
    // This dynamic import is the first evaluation in this file:
    // initPromise = null and db = null → doInitDatabase() runs unconditionally.
    const { initDatabase, closeDatabase } = await import("@/db/client");
    await initDatabase();
    // Reset the module-level db singleton so any subsequent test starts clean.
    await closeDatabase().catch(() => {});

    expect(capturedKey).toBeDefined();
    // generateEncryptionKey() produces 32 random bytes encoded as lowercase hex → 64 chars.
    expect(capturedKey).toMatch(/^[0-9a-f]{64}$/);
  });
});

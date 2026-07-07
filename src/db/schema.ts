import type { SQLiteDBConnection } from "@capacitor-community/sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT NOT NULL,
  icon       TEXT NOT NULL,
  color      TEXT NOT NULL,
  bg_color   TEXT NOT NULL,
  start_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id   INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN ('start', 'relapse')),
  event_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  label            TEXT NOT NULL,
  frequency        TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
  reminder_time    TEXT NOT NULL DEFAULT '08:00',
  reminder_enabled INTEGER NOT NULL DEFAULT 1,
  reminder_day     INTEGER DEFAULT NULL
    CHECK(
      (frequency = 'daily'   AND reminder_day IS NULL)
      OR (frequency = 'weekly'  AND reminder_day BETWEEN 0 AND 6)
      OR (frequency = 'monthly' AND (reminder_day = 0 OR reminder_day BETWEEN 1 AND 28))
    ),
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatment_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  treatment_id INTEGER NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  status       TEXT NOT NULL CHECK(status IN ('taken', 'missed', 'pending'))
);
`;

async function isApplied(db: SQLiteDBConnection, name: string): Promise<boolean> {
  const result = await db.query(
    "SELECT 1 FROM schema_migrations WHERE name = ?",
    [name],
  );
  return (result.values ?? []).length > 0;
}

async function markApplied(db: SQLiteDBConnection, name: string): Promise<void> {
  await db.run(
    "INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)",
    [name, new Date().toISOString()],
  );
}

// Guard against SQLCipher versions that throw on CREATE INDEX even with IF NOT EXISTS
// when the index already exists. On pre-C7 installs the index was created by the old
// schema code (which had a catch-all try/catch), so we check sqlite_master first.
async function indexExists(db: SQLiteDBConnection, indexName: string): Promise<boolean> {
  const result = await db.query(
    "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
    [indexName],
  );
  return (result.values ?? []).length > 0;
}

async function columnExists(db: SQLiteDBConnection, table: string, column: string): Promise<boolean> {
  const result = await db.query(`PRAGMA table_info(${table})`);
  return ((result.values ?? []) as { name: string }[]).some((col) => col.name === column);
}

export async function runSchema(db: SQLiteDBConnection): Promise<void> {
  await db.execute(SCHEMA);

  // Deduplicate treatment_logs before enforcing the unique index.
  // Rule: keep the entry with the best status (taken > missed > pending), then the
  // newest row (highest id) when statuses are equal. The imported entry always wins
  // over the existing one because imports use clearAllData first (replace mode).
  if (!(await isApplied(db, "dedup_treatment_logs_v2"))) {
    if (!(await indexExists(db, "idx_treatment_logs_unique"))) {
      // Fresh install or pre-index install: run dedup then create the index.
      // If the index already exists, duplicates were already cleaned by the old schema.
      await db.execute(`
        DELETE FROM treatment_logs
        WHERE id NOT IN (
          SELECT id FROM treatment_logs tl
          WHERE NOT EXISTS (
            SELECT 1 FROM treatment_logs t2
            WHERE t2.treatment_id = tl.treatment_id
              AND t2.scheduled_at = tl.scheduled_at
              AND (
                CASE t2.status WHEN 'taken' THEN 0 WHEN 'missed' THEN 1 ELSE 2 END <
                CASE tl.status WHEN 'taken' THEN 0 WHEN 'missed' THEN 1 ELSE 2 END
                OR (t2.status = tl.status AND t2.id > tl.id)
              )
          )
        )
      `);
      await db.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_treatment_logs_unique ON treatment_logs(treatment_id, scheduled_at)",
      );
    }
    await markApplied(db, "dedup_treatment_logs_v2");
  }

  if (!(await isApplied(db, "idx_habit_logs_habit_id"))) {
    if (!(await indexExists(db, "idx_habit_logs_habit_id"))) {
      await db.execute("CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)");
    }
    await markApplied(db, "idx_habit_logs_habit_id");
  }

  if (!(await isApplied(db, "idx_treatment_logs_scheduled_at"))) {
    if (!(await indexExists(db, "idx_treatment_logs_scheduled_at"))) {
      await db.execute("CREATE INDEX IF NOT EXISTS idx_treatment_logs_scheduled_at ON treatment_logs(scheduled_at)");
    }
    await markApplied(db, "idx_treatment_logs_scheduled_at");
  }

  if (!(await isApplied(db, "sort_index_habits"))) {
    if (!(await columnExists(db, "habits", "sort_index"))) {
      await db.execute("ALTER TABLE habits ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0");
    }
    await markApplied(db, "sort_index_habits");
  }

  if (!(await isApplied(db, "sort_index_treatments"))) {
    if (!(await columnExists(db, "treatments", "sort_index"))) {
      await db.execute("ALTER TABLE treatments ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0");
    }
    await markApplied(db, "sort_index_treatments");
  }

  if (!(await isApplied(db, "treatments_reminder_day_check"))) {
    // Clean up any leftover table from a previous interrupted run before starting.
    await db.execute("DROP TABLE IF EXISTS treatments_new");
    // PRAGMA foreign_keys must be set outside a transaction in SQLite.
    await db.execute("PRAGMA foreign_keys = OFF");
    await db.beginTransaction();
    try {
      await db.execute(`
        CREATE TABLE treatments_new (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          label            TEXT NOT NULL,
          frequency        TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
          reminder_time    TEXT NOT NULL DEFAULT '08:00',
          reminder_enabled INTEGER NOT NULL DEFAULT 1,
          reminder_day     INTEGER DEFAULT NULL
            CHECK(
              (frequency = 'daily'   AND reminder_day IS NULL)
              OR (frequency = 'weekly'  AND reminder_day BETWEEN 0 AND 6)
              OR (frequency = 'monthly' AND (reminder_day = 0 OR reminder_day BETWEEN 1 AND 28))
            ),
          created_at       TEXT NOT NULL,
          sort_index       INTEGER NOT NULL DEFAULT 0
        )
      `, false);
      await db.execute(`
        INSERT INTO treatments_new (id, label, frequency, reminder_time, reminder_enabled, reminder_day, created_at, sort_index)
        SELECT
          id, label, frequency, reminder_time, reminder_enabled,
          CASE frequency
            WHEN 'daily'   THEN NULL
            WHEN 'weekly'  THEN CASE WHEN reminder_day BETWEEN 0 AND 6 THEN reminder_day ELSE 1 END
            WHEN 'monthly' THEN CASE WHEN reminder_day = 0 OR reminder_day BETWEEN 1 AND 28 THEN reminder_day ELSE 1 END
            ELSE NULL
          END,
          created_at, sort_index
        FROM treatments
      `, false);
      await db.execute("DROP TABLE treatments", false);
      await db.execute("ALTER TABLE treatments_new RENAME TO treatments", false);
      await db.run(
        "INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)",
        ["treatments_reminder_day_check", new Date().toISOString()],
        false,
      );
      await db.commitTransaction();
    } catch (err) {
      await db.rollbackTransaction().catch(() => {});
      await db.execute("PRAGMA foreign_keys = ON");
      throw err;
    }
    await db.execute("PRAGMA foreign_keys = ON");
  }
}

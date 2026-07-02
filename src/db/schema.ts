import type { SQLiteDBConnection } from "@capacitor-community/sqlite";

const SCHEMA = `
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
  reminder_day     INTEGER DEFAULT NULL,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatment_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  treatment_id INTEGER NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  status       TEXT NOT NULL CHECK(status IN ('taken', 'missed', 'pending'))
);
`;

export async function runSchema(db: SQLiteDBConnection): Promise<void> {
  await db.execute(SCHEMA);
  try {
    await db.execute("ALTER TABLE treatments ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 1");
  } catch {
    // column already exists
  }
  try {
    await db.execute("ALTER TABLE treatments ADD COLUMN reminder_day INTEGER DEFAULT NULL");
  } catch {
    // column already exists
  }
  try {
    // Remove duplicate logs before adding unique constraint (keep oldest per treatment+date)
    await db.execute(`
      DELETE FROM treatment_logs WHERE id NOT IN (
        SELECT MIN(id) FROM treatment_logs GROUP BY treatment_id, scheduled_at
      )
    `);
    await db.execute(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_treatment_logs_unique ON treatment_logs(treatment_id, scheduled_at)",
    );
  } catch {
    // index already exists or migration already applied
  }
  try {
    await db.execute("CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)");
  } catch {
    // index already exists
  }
}

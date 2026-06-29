import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import { runSchema } from "./schema";

const DB_NAME = "esperanzapp";
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

export async function initDatabase(): Promise<void> {
  if (db) return;

  if (Capacitor.getPlatform() === "web") {
    // jeep-sqlite WASM fails to link in browser dev (v2.8.0 packaging bug).
    // App renders with empty state — use `npx cap run android` for full testing.
    return;
  }

  const { result: exists } = await sqlite.isConnection(DB_NAME, false);
  db = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);

  await db.open();
  await runSchema(db);
}

export function withDb<T>(fn: (db: SQLiteDBConnection) => Promise<T>, fallback: T): Promise<T> {
  if (!db) return Promise.resolve(fallback);
  return fn(db);
}

export async function withDbVoid(
  fn: (db: SQLiteDBConnection) => Promise<void>,
  onUnavailable?: () => void,
): Promise<void> {
  if (!db) { onUnavailable?.(); return; }
  return fn(db);
}

export function getDb(): SQLiteDBConnection {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (!db) return;
  await db.close();
  db = null;
}

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import { runSchema } from "./schema";

const DB_NAME = "esperanzapp";
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;
let initPromise: Promise<void> | null = null;

function generateEncryptionKey(): string {
  const bytes = new Uint8Array(new ArrayBuffer(32)); // 256 bits
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Guards against concurrent calls before db is assigned (e.g. two awaits racing in bootstrap).
// On failure, the promise is cleared so the next call can retry.
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = doInitDatabase().catch((e: unknown) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

async function doInitDatabase(): Promise<void> {
  if (db) return;

  if (Capacitor.getPlatform() === "web") {
    // jeep-sqlite WASM fails to link in browser dev (v2.8.0 packaging bug).
    // App renders with empty state. Use `npx cap run android` for full testing.
    return;
  }

  // Ensure an encryption key exists in the plugin's native secure store (Android Keystore
  // on Android, iOS Keychain on iOS). Generated once per installation; permanently deleted
  // on uninstall, the DB file becomes permanently unreadable without the key.
  // The only way to preserve data across reinstalls is an explicit export (see DataExportSection).
  const { result: hasSecret } = await sqlite.isSecretStored();
  if (!hasSecret) {
    await sqlite.setEncryptionSecret(generateEncryptionKey());
  }

  const { result: exists } = await sqlite.isConnection(DB_NAME, false);
  db = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, true, "secret", 1, false);

  try {
    await db.open();
  } catch (cause) {
    // DB file may be from a pre-encryption install or tied to a different Keystore key.
    // Surface as a recoverable error: the user can explicitly reset via DbErrorScreen.
    db = null;
    try {
      await sqlite.closeConnection(DB_NAME, false);
    } catch {
      /* ignore */
    }
    throw new Error("Database file could not be opened with the current encryption key.", {
      cause,
    });
  }

  try {
    await db.execute("PRAGMA foreign_keys = ON");
    await runSchema(db);
  } catch (e) {
    const staleDb = db;
    db = null;
    try {
      await staleDb.close();
    } catch {
      /* ignore */
    }
    try {
      await sqlite.closeConnection(DB_NAME, false);
    } catch {
      /* ignore */
    }
    throw e;
  }
}

export function withDb<T>(fn: (db: SQLiteDBConnection) => Promise<T>, fallback: T): Promise<T> {
  if (!db) {
    if (Capacitor.isNativePlatform()) return Promise.reject(new Error("DB not initialized"));
    return Promise.resolve(fallback);
  }
  return fn(db);
}

export async function withDbVoid(
  fn: (db: SQLiteDBConnection) => Promise<void>,
  onUnavailable?: () => void,
): Promise<void> {
  if (!db) {
    if (Capacitor.isNativePlatform()) throw new Error("DB not initialized");
    onUnavailable?.();
    return;
  }
  return fn(db);
}

let txQueue: Promise<unknown> = Promise.resolve();

export function runInTransaction<T>(fn: (db: SQLiteDBConnection | null) => Promise<T>): Promise<T> {
  if (!db) return fn(null);
  const capturedDb = db;
  const run = async (): Promise<T> => {
    await capturedDb.beginTransaction();
    try {
      const result = await fn(capturedDb);
      await capturedDb.commitTransaction();
      return result;
    } catch (e) {
      await capturedDb.rollbackTransaction().catch(() => {});
      throw e;
    }
  };
  const chained = txQueue.then(run);
  txQueue = chained.catch(() => {});
  return chained;
}

export function clearAllData(dbConn?: SQLiteDBConnection | null): Promise<void> {
  const fn = async (db: SQLiteDBConnection) => {
    await db.execute("DELETE FROM treatment_logs", false);
    await db.execute("DELETE FROM habit_logs", false);
    await db.execute("DELETE FROM positive_habit_logs", false);
    await db.execute("DELETE FROM positive_habit_milestone_notifications", false);
    await db.execute("DELETE FROM treatments", false);
    await db.execute("DELETE FROM habits", false);
    await db.execute("DELETE FROM positive_habits", false);
  };
  if (dbConn) return fn(dbConn);
  return runInTransaction((db) => (db ? fn(db) : Promise.resolve()));
}

export async function closeDatabase(): Promise<void> {
  if (!db) return;
  await txQueue.catch(() => {}); // drain pending transactions before closing
  await db.close();
  db = null;
  initPromise = null; // allow re-initialization after an explicit close
}

// Called by DbErrorScreen when the user explicitly chooses to reset.
// Deletes the stale DB file so the next initDatabase() call starts fresh.
export async function deleteStaleDatabase(): Promise<void> {
  if (db) {
    try {
      await db.close();
    } catch {
      /* ignore */
    }
    db = null;
  }
  try {
    await sqlite.closeConnection(DB_NAME, false);
  } catch {
    /* ignore */
  }
  // Create a plain (unencrypted) connection just to get a handle for deletion.
  // No open() call needed: delete() operates on the file path directly.
  // Do NOT catch the delete() error: if it fails, the caller must NOT reload
  // (that would cause an infinite reset loop). Defensive closes stay silent.
  const conn = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  try {
    await conn.delete();
  } finally {
    try {
      await sqlite.closeConnection(DB_NAME, false);
    } catch {
      /* ignore */
    }
  }
}

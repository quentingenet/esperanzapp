/**
 * In-memory SQLite connection backed by sql.js (asm.js build, no WebAssembly needed).
 *
 * SECURITY NOTE: run() intentionally omits lastId from the returned changes object.
 * This reproduces the worst-case Android behavior where @capacitor-community/sqlite
 * returns undefined/0 for changes.lastId after a successful INSERT.
 * Any create* function that regresses to reading changes.lastId instead of using
 * SELECT last_insert_rowid() AS id will fail the integration tests, as intended.
 */
import { runSchema } from "@/db/schema";

type SqlJsStatement = {
  bind(params: unknown[]): void;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
};

type SqlJsDb = {
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  run(sql: string, params?: unknown[]): unknown;
  prepare(sql: string): SqlJsStatement;
  getRowsModified(): number;
  close(): void;
};

type SqlJsModule = { Database: new () => SqlJsDb };

// CJS interop: sql-asm.js exports via module.exports; dynamic import wraps it as default.
async function loadSqlJs(): Promise<(cfg?: object) => Promise<SqlJsModule>> {
  const mod = await import("sql.js/dist/sql-asm.js");
  return mod.default;
}

export type RealSqliteConn = {
  execute(sql: string): Promise<{ changes: { changes: number } }>;
  run(sql: string, params?: unknown[]): Promise<{ changes: { changes: number } }>;
  query(sql: string, params?: unknown[]): Promise<{ values: Record<string, unknown>[] }>;
  open(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
};

export async function createRealSqliteConnection(): Promise<RealSqliteConn> {
  const initSqlJs = await loadSqlJs();
  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();

  return {
    open: async () => {},
    close: async () => {
      sqlDb.close();
    },

    execute: async (sql: string) => {
      const trimmed = sql.trim();
      // Silently skip SQLCipher-only PRAGMAs not understood by sql.js.
      if (/^pragma\s+(key|cipher|kdf_iter|memory_security)/i.test(trimmed)) {
        return { changes: { changes: 0 } };
      }
      sqlDb.exec(sql);
      return { changes: { changes: 0 } };
    },

    run: async (sql: string, params?: unknown[]) => {
      sqlDb.run(sql, params);
      // Intentionally NO lastId field - reproduces Android plugin behavior.
      return { changes: { changes: sqlDb.getRowsModified() } };
    },

    query: async (sql: string, params?: unknown[]) => {
      const stmt = sqlDb.prepare(sql);
      if (params && params.length > 0) stmt.bind(params);
      const values: Record<string, unknown>[] = [];
      while (stmt.step()) {
        values.push(stmt.getAsObject());
      }
      stmt.free();
      return { values };
    },

    beginTransaction: async () => {
      sqlDb.exec("BEGIN TRANSACTION");
    },
    commitTransaction: async () => {
      sqlDb.exec("COMMIT");
    },
    rollbackTransaction: async () => {
      sqlDb.exec("ROLLBACK");
    },
  };
}

export async function createInitializedSqliteConnection(): Promise<RealSqliteConn> {
  const conn = await createRealSqliteConnection();
  await conn.execute("PRAGMA foreign_keys = ON");
  await runSchema(conn as never);
  return conn;
}

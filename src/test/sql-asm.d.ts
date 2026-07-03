declare module "sql.js/dist/sql-asm.js" {
  const initSqlJs: (config?: object) => Promise<{
    Database: new (data?: Uint8Array) => {
      exec(sql: string): { columns: string[]; values: unknown[][] }[];
      run(sql: string, params?: unknown[]): unknown;
      prepare(sql: string): {
        bind(params: unknown[]): void;
        step(): boolean;
        getAsObject(): Record<string, unknown>;
        free(): void;
      };
      getRowsModified(): number;
      close(): void;
    };
  }>;
  export default initSqlJs;
}

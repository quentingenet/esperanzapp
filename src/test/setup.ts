import "@testing-library/jest-dom";
import { vi } from "vitest";

const mockDb = {
  open: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  execute: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
  run: vi.fn().mockResolvedValue({ changes: { changes: 1, lastId: 1 } }),
  query: vi.fn().mockResolvedValue({ values: [] }),
};

vi.mock("@capacitor-community/sqlite", () => ({
  CapacitorSQLite: {},
  // Must use `function` (not arrow) so Vitest 4 allows `new SQLiteConnection()`
  SQLiteConnection: vi.fn().mockImplementation(function () {
    return {
      isSecretStored: vi.fn().mockResolvedValue({ result: true }),
      setEncryptionSecret: vi.fn().mockResolvedValue(undefined),
      isConnection: vi.fn().mockResolvedValue({ result: false }),
      createConnection: vi.fn().mockResolvedValue(mockDb),
      retrieveConnection: vi.fn().mockResolvedValue(mockDb),
      closeConnection: vi.fn().mockResolvedValue(undefined),
      initWebStore: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
  registerPlugin: vi.fn(),
}));

vi.mock("@capacitor/share", () => ({
  Share: {
    share: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    requestPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    schedule: vi.fn().mockResolvedValue({}),
    cancel: vi.fn().mockResolvedValue({}),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
  },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue({ uri: "file:///cache/esperanzapp_export.json" }),
    deleteFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
  Directory: {
    Documents: "DOCUMENTS",
    Data: "DATA",
    Cache: "CACHE",
    External: "EXTERNAL",
  },
  Encoding: {
    UTF8: "utf8",
  },
}));

vi.mock("jeep-sqlite/loader", () => ({
  defineCustomElements: vi.fn().mockResolvedValue(undefined),
}));

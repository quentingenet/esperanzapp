import "@testing-library/jest-dom";
import { vi } from "vitest";

export const sqliteTestDb = {
  open: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  execute: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
  run: vi.fn().mockResolvedValue({ changes: { changes: 1, lastId: 1 } }),
  query: vi.fn().mockResolvedValue({ values: [] }),
  beginTransaction: vi.fn().mockResolvedValue({}),
  commitTransaction: vi.fn().mockResolvedValue({}),
  rollbackTransaction: vi.fn().mockResolvedValue({}),
};

vi.mock("@capacitor-community/sqlite", () => ({
  CapacitorSQLite: {},
  // Must use `function` (not arrow) so Vitest 4 allows `new SQLiteConnection()`
  SQLiteConnection: vi.fn().mockImplementation(function () {
    return {
      isSecretStored: vi.fn().mockResolvedValue({ result: true }),
      setEncryptionSecret: vi.fn().mockResolvedValue(undefined),
      isConnection: vi.fn().mockResolvedValue({ result: false }),
      createConnection: vi.fn().mockResolvedValue(sqliteTestDb),
      retrieveConnection: vi.fn().mockResolvedValue(sqliteTestDb),
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
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
  Weekday: {
    Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4,
    Thursday: 5, Friday: 6, Saturday: 7,
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

vi.mock("capacitor-native-settings", () => ({
  NativeSettings: {
    open: vi.fn().mockResolvedValue({ status: true }),
    openAndroid: vi.fn().mockResolvedValue({ status: true }),
  },
  AndroidSettings: {
    ApplicationDetails: "application_details",
    AppNotification: "app_notification",
  },
  IOSSettings: {
    App: "app",
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    exitApp: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/plugins/ExactAlarm", () => ({
  ExactAlarm: {
    canScheduleExactAlarms: vi.fn().mockResolvedValue({ value: true }),
    requestExactAlarmPermission: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("jeep-sqlite/loader", () => ({
  defineCustomElements: vi.fn().mockResolvedValue(undefined),
}));

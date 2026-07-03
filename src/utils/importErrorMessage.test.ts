import { describe, expect, it } from "vitest";
import {
  ImportStorageError,
  InconsistentImportDataError,
  InvalidImportFileError,
  UnsupportedImportVersionError,
  WrongPasswordError,
} from "@/services/exportService";
import { getImportErrorTranslationKey } from "./importErrorMessage";

describe("getImportErrorTranslationKey", () => {
  it.each([
    [new WrongPasswordError(), "export.encryptedImportError"],
    [new UnsupportedImportVersionError(), "export.importUnsupportedVersion"],
    [new InconsistentImportDataError("orphan"), "export.importInconsistentData"],
    [new InvalidImportFileError(), "export.importInvalidFile"],
    [new ImportStorageError(), "export.importStorageError"],
    [new Error("unexpected"), "common.error"],
  ])("maps %s to %s", (error, key) => {
    expect(getImportErrorTranslationKey(error)).toBe(key);
  });
});

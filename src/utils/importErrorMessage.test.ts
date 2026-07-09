import { describe, expect, it } from "vitest";
import {
  CorruptFileError,
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
    [new CorruptFileError(), "export.importInvalidFile"],
    [new UnsupportedImportVersionError(), "export.importUnsupportedVersion"],
    [new InconsistentImportDataError("orphan"), "export.importInconsistentData"],
    [new InvalidImportFileError(), "export.importInvalidFile"],
    [new ImportStorageError(), "export.importStorageError"],
    [new Error("unexpected"), "common.error"],
  ])("maps %s to %s", (error, key) => {
    expect(getImportErrorTranslationKey(error)).toBe(key);
  });
});

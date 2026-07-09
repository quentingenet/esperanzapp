import {
  CorruptFileError,
  ImportStorageError,
  InconsistentImportDataError,
  InvalidImportFileError,
  UnsupportedImportVersionError,
  WrongPasswordError,
} from "@/services/exportService";

export type ImportErrorTranslationKey =
  | "export.encryptedImportError"
  | "export.importUnsupportedVersion"
  | "export.importInconsistentData"
  | "export.importInvalidFile"
  | "export.importStorageError"
  | "common.error";

export function getImportErrorTranslationKey(error: unknown): ImportErrorTranslationKey {
  if (error instanceof WrongPasswordError) return "export.encryptedImportError";
  if (error instanceof CorruptFileError) return "export.importInvalidFile";
  if (error instanceof UnsupportedImportVersionError) return "export.importUnsupportedVersion";
  if (error instanceof InconsistentImportDataError) return "export.importInconsistentData";
  if (error instanceof InvalidImportFileError) return "export.importInvalidFile";
  if (error instanceof ImportStorageError) return "export.importStorageError";
  return "common.error";
}

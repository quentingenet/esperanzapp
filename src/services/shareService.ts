import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export type ShareOutcome = "ok" | "filesystem-error" | "share-cancelled";
export type SaveOutcome = "ok" | "filesystem-error" | "documents-unavailable";

export function downloadBlobWeb(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareFile(filename: string, content: string, mime: string): Promise<ShareOutcome> {
  if (!Capacitor.isNativePlatform()) {
    downloadBlobWeb(content, filename, mime);
    return "ok";
  }
  let result: Awaited<ReturnType<typeof Filesystem.writeFile>>;
  try {
    result = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
  } catch {
    return "filesystem-error";
  }
  try {
    await Share.share({ url: result.uri, title: filename, dialogTitle: filename });
    return "ok";
  } catch {
    return "share-cancelled";
  }
}

export async function saveToFolder(filename: string, content: string, mime: string): Promise<SaveOutcome> {
  if (!Capacitor.isNativePlatform()) {
    downloadBlobWeb(content, filename, mime);
    return "ok";
  }
  try {
    await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return "ok";
  } catch {
    // Directory.Documents may be inaccessible on Android 10+ (scoped storage)
    return "documents-unavailable";
  }
}

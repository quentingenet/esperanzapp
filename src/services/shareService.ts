import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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

export async function shareFile(filename: string, content: string, mime: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    downloadBlobWeb(content, filename, mime);
    return true;
  }
  const result = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ url: result.uri, title: filename, dialogTitle: filename });
    return true;
  } catch {
    return false;
  }
}

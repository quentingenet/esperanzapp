import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { shareFile } from "./shareService";

describe("shareFile cache cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: "file:///cache/export.json" });
    vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined);
    vi.mocked(Share.share).mockResolvedValue({ activityType: "test" });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("delays cleanup after a successful share so the recipient can read the file", async () => {
    await expect(shareFile("export.json", "{}", "application/json")).resolves.toBe("ok");
    expect(Filesystem.deleteFile).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path: "export.json",
      directory: Directory.Cache,
    });
  });

  it("deletes the cached export when sharing is cancelled", async () => {
    vi.mocked(Share.share).mockRejectedValueOnce(new Error("cancelled"));
    await expect(shareFile("export.json", "{}", "application/json")).resolves.toBe(
      "share-cancelled",
    );
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path: "export.json",
      directory: Directory.Cache,
    });
  });

  it("keeps the cancellation result when cache cleanup fails", async () => {
    vi.mocked(Share.share).mockRejectedValueOnce(new Error("cancelled"));
    vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error("cleanup failed"));
    await expect(shareFile("export.json", "{}", "application/json")).resolves.toBe(
      "share-cancelled",
    );
  });

  it("does not surface a delayed cleanup failure after a successful share", async () => {
    vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error("cleanup failed"));
    await expect(shareFile("export.json", "{}", "application/json")).resolves.toBe("ok");
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(Filesystem.deleteFile).toHaveBeenCalledTimes(1);
  });
});

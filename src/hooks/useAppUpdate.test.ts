import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppUpdate } from "./useAppUpdate";
import { Capacitor } from "@capacitor/core";
import { AppUpdate, AppUpdateAvailability } from "@capawesome/capacitor-app-update";

vi.mock("@capawesome/capacitor-app-update", () => ({
  AppUpdate: {
    getAppUpdateInfo: vi.fn(),
    performImmediateUpdate: vi.fn(),
    openAppStore: vi.fn(),
  },
  AppUpdateAvailability: {
    UNKNOWN: 0,
    UPDATE_NOT_AVAILABLE: 1,
    UPDATE_AVAILABLE: 2,
    DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS: 3,
  },
}));

describe("useAppUpdate", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(AppUpdate.getAppUpdateInfo).mockResolvedValue(
      { updateAvailability: AppUpdateAvailability.UPDATE_NOT_AVAILABLE } as never,
    );
    vi.mocked(AppUpdate.performImmediateUpdate).mockResolvedValue(undefined as never);
    vi.mocked(AppUpdate.openAppStore).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.mocked(AppUpdate.getAppUpdateInfo).mockClear();
    vi.mocked(AppUpdate.performImmediateUpdate).mockClear();
    vi.mocked(AppUpdate.openAppStore).mockClear();
  });

  it("returns 'up-to-date' on non-native platform without calling native API", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { result } = renderHook(() => useAppUpdate());
    let status: string | undefined;
    await act(async () => { status = await result.current.checkForUpdate(); });
    expect(status).toBe("up-to-date");
    expect(AppUpdate.getAppUpdateInfo).not.toHaveBeenCalled();
  });

  it("returns 'available' and sets status when an update is available", async () => {
    vi.mocked(AppUpdate.getAppUpdateInfo).mockResolvedValue(
      { updateAvailability: AppUpdateAvailability.UPDATE_AVAILABLE } as never,
    );
    const { result } = renderHook(() => useAppUpdate());
    let status: string | undefined;
    await act(async () => { status = await result.current.checkForUpdate(); });
    expect(status).toBe("available");
    expect(result.current.status).toBe("available");
  });

  it("returns 'up-to-date' and sets status when no update is available", async () => {
    const { result } = renderHook(() => useAppUpdate());
    let status: string | undefined;
    await act(async () => { status = await result.current.checkForUpdate(); });
    expect(status).toBe("up-to-date");
    expect(result.current.status).toBe("up-to-date");
  });

  it("returns 'error' and sets status when native check throws", async () => {
    vi.mocked(AppUpdate.getAppUpdateInfo).mockRejectedValue(new Error("network failure"));
    const { result } = renderHook(() => useAppUpdate());
    let status: string | undefined;
    await act(async () => { status = await result.current.checkForUpdate(); });
    expect(status).toBe("error");
    expect(result.current.status).toBe("error");
  });

  it("openUpdate calls performImmediateUpdate on native platform", async () => {
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => { await result.current.openUpdate(); });
    expect(AppUpdate.performImmediateUpdate).toHaveBeenCalled();
    expect(AppUpdate.openAppStore).not.toHaveBeenCalled();
  });

  it("openUpdate falls back to openAppStore when performImmediateUpdate throws", async () => {
    vi.mocked(AppUpdate.performImmediateUpdate).mockRejectedValue(new Error("not supported"));
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => { await result.current.openUpdate(); });
    expect(AppUpdate.openAppStore).toHaveBeenCalled();
  });

  it("openUpdate does nothing on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => { await result.current.openUpdate(); });
    expect(AppUpdate.performImmediateUpdate).not.toHaveBeenCalled();
    expect(AppUpdate.openAppStore).not.toHaveBeenCalled();
  });
});

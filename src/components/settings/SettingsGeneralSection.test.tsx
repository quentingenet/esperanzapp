import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsGeneralSection } from "./SettingsGeneralSection";

const mocks = vi.hoisted(() => ({
  checkForUpdate: vi.fn(),
  openUpdate: vi.fn(),
  saveName: vi.fn(),
  requestPermission: vi.fn(),
  getPermissionStatus: vi.fn(),
  getExactAlarmStatus: vi.fn().mockResolvedValue(true),
  openExactAlarmSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks", () => ({
  useOnboarding: () => ({ saveName: mocks.saveName }),
  useAppUpdate: () => ({
    status: "idle",
    checkForUpdate: mocks.checkForUpdate,
    openUpdate: mocks.openUpdate,
  }),
  useNotifications: () => ({
    requestPermission: mocks.requestPermission,
    getPermissionStatus: mocks.getPermissionStatus,
    getExactAlarmStatus: mocks.getExactAlarmStatus,
    openExactAlarmSettings: mocks.openExactAlarmSettings,
  }),
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "fr", changeLanguage: vi.fn() },
    }),
  };
});

describe("SettingsGeneralSection update dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkForUpdate.mockResolvedValue("available");
    mocks.openUpdate.mockResolvedValue(undefined);
    mocks.getPermissionStatus.mockResolvedValue(false);
    mocks.requestPermission.mockResolvedValue(true);
  });

  it("asks for confirmation before opening an available update", async () => {
    const user = userEvent.setup();
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "update.checkBtn" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("update.availableBody");
    expect(mocks.openUpdate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "update.updateNow" }));
    expect(mocks.openUpdate).toHaveBeenCalledTimes(1);
  });

  it("closes the dialog without opening the update when postponed", async () => {
    const user = userEvent.setup();
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "update.checkBtn" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "update.later" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.openUpdate).not.toHaveBeenCalled();
  });
});

describe("SettingsGeneralSection notification switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkForUpdate.mockResolvedValue("up-to-date");
    mocks.getPermissionStatus.mockResolvedValue(false);
    mocks.requestPermission.mockResolvedValue(true);
  });

  it("does not render the notification switch when getPermissionStatus returns null (web)", async () => {
    mocks.getPermissionStatus.mockResolvedValue(null);
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);
    await waitFor(() => {
      expect(mocks.getPermissionStatus).toHaveBeenCalled();
    });
    expect(screen.queryByText("settings.notifications")).not.toBeInTheDocument();
  });

  it("renders the notification switch unchecked when permission is denied", async () => {
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("common.disabled")).toBeInTheDocument();
    });
  });

  it("renders the notification switch checked when permission is granted", async () => {
    mocks.getPermissionStatus.mockResolvedValue(true);
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeChecked();
    });
  });

  it("calls requestPermission when toggling switch on", async () => {
    const user = userEvent.setup();
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("common.disabled")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("switch"));
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("updates switch to checked after requestPermission resolves true", async () => {
    const user = userEvent.setup();
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("common.disabled")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("switch"));
    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeChecked();
    });
  });

  it("does not call requestPermission when switch is already on", async () => {
    mocks.getPermissionStatus.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<SettingsGeneralSection onReplayTutorial={vi.fn()} onShowTerms={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeChecked();
    });
    await user.click(screen.getByRole("switch"));
    expect(mocks.requestPermission).not.toHaveBeenCalled();
  });
});

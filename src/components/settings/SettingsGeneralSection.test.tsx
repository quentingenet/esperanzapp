import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsGeneralSection } from "./SettingsGeneralSection";

const mocks = vi.hoisted(() => ({
  checkForUpdate: vi.fn(),
  openUpdate: vi.fn(),
  saveName: vi.fn(),
}));

vi.mock("@/hooks", () => ({
  useOnboarding: () => ({ saveName: mocks.saveName }),
  useAppUpdate: () => ({
    status: "idle",
    checkForUpdate: mocks.checkForUpdate,
    openUpdate: mocks.openUpdate,
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

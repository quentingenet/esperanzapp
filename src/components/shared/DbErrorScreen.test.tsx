import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DbErrorScreen } from "./DbErrorScreen";
import { deleteStaleDatabase, initDatabase } from "@/db/client";

vi.mock("@/db/client", () => ({
  deleteStaleDatabase: vi.fn(),
  initDatabase: vi.fn(),
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "en" },
    }),
  };
});

describe("DbErrorScreen", () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    reloadMock.mockReset();
    // jsdom's window.location.reload is non-configurable, so it can't be spied on directly.
    // vi.stubGlobal replaces the global binding itself instead of the property descriptor.
    vi.stubGlobal("location", { reload: reloadMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the title, body and both actions", () => {
    render(<DbErrorScreen />);
    expect(screen.getByText("startup.dbErrorTitle")).toBeInTheDocument();
    expect(screen.getByText("startup.dbErrorBody")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "startup.dbErrorRetry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "startup.dbErrorReset" })).toBeInTheDocument();
  });

  describe("retry", () => {
    it("reloads the page when initDatabase succeeds", async () => {
      vi.mocked(initDatabase).mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<DbErrorScreen />);
      await user.click(screen.getByRole("button", { name: "startup.dbErrorRetry" }));
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalledTimes(1);
      });
      expect(deleteStaleDatabase).not.toHaveBeenCalled();
    });

    it("stays on the error screen (re-enables the buttons) when initDatabase fails again", async () => {
      vi.mocked(initDatabase).mockRejectedValue(new Error("still broken"));
      const user = userEvent.setup();
      render(<DbErrorScreen />);
      await user.click(screen.getByRole("button", { name: "startup.dbErrorRetry" }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "startup.dbErrorRetry" })).not.toBeDisabled();
      });
      expect(reloadMock).not.toHaveBeenCalled();
      expect(screen.getByText("startup.dbErrorBody")).toBeInTheDocument();
    });
  });

  describe("reset", () => {
    it("asks for confirmation before deleting local data, and does nothing if declined", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const user = userEvent.setup();
      render(<DbErrorScreen />);
      await user.click(screen.getByRole("button", { name: "startup.dbErrorReset" }));
      expect(window.confirm).toHaveBeenCalledWith("startup.dbErrorResetConfirm");
      expect(deleteStaleDatabase).not.toHaveBeenCalled();
      expect(reloadMock).not.toHaveBeenCalled();
    });

    it("deletes the database and reloads once the user confirms", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(deleteStaleDatabase).mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<DbErrorScreen />);
      await user.click(screen.getByRole("button", { name: "startup.dbErrorReset" }));
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalledTimes(1);
      });
      expect(deleteStaleDatabase).toHaveBeenCalledTimes(1);
    });

    it("shows the reinstall message and hides the actions when the reset itself fails", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(deleteStaleDatabase).mockRejectedValue(new Error("delete failed"));
      const user = userEvent.setup();
      render(<DbErrorScreen />);
      await user.click(screen.getByRole("button", { name: "startup.dbErrorReset" }));
      await waitFor(() => {
        expect(screen.getByText("startup.dbErrorResetFailed")).toBeInTheDocument();
      });
      expect(
        screen.queryByRole("button", { name: "startup.dbErrorReset" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "startup.dbErrorRetry" }),
      ).not.toBeInTheDocument();
      expect(reloadMock).not.toHaveBeenCalled();
    });
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Home } from "./Home";
import { useHomeTabStore } from "@/store/homeTabStore";

vi.mock("@/components/home", () => ({
  ReduceHabitsTab: () => <div data-testid="reduce-tab" />,
  BuildHabitsTab: () => <div data-testid="build-tab" />,
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

describe("Home", () => {
  beforeEach(() => {
    useHomeTabStore.setState({ pendingTab: null });
  });

  it("defaults to the 'reduce' tab when no sub-tab is pending", () => {
    render(<Home />);
    expect(screen.getByTestId("reduce-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("build-tab")).not.toBeInTheDocument();
  });

  it("opens directly on the 'build' tab when homeTabStore has a pending 'build' request", () => {
    useHomeTabStore.getState().setPendingTab("build");
    render(<Home />);
    expect(screen.getByTestId("build-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("reduce-tab")).not.toBeInTheDocument();
  });

  it("consumes the pending tab on mount — it does not stick across a later remount", () => {
    useHomeTabStore.getState().setPendingTab("build");
    const { unmount } = render(<Home />);
    expect(screen.getByTestId("build-tab")).toBeInTheDocument();
    unmount();

    // Second mount with nothing newly pending must fall back to the default tab.
    render(<Home />);
    expect(screen.getByTestId("reduce-tab")).toBeInTheDocument();
  });

  it("switches from 'reduce' to 'build' when the user taps the build tab", async () => {
    const user = userEvent.setup();
    render(<Home />);
    expect(screen.getByTestId("reduce-tab")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "common.tabs.build" }));
    expect(screen.getByTestId("build-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("reduce-tab")).not.toBeInTheDocument();
  });
});

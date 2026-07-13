import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Milestones } from "./Milestones";

vi.mock("@/components/home", () => ({
  ReduceMilestonesTab: () => <div data-testid="reduce-tab" />,
  BuildMilestonesTab: () => <div data-testid="build-tab" />,
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

describe("Milestones", () => {
  it("defaults to the 'reduce' tab", () => {
    render(<Milestones />);
    expect(screen.getByTestId("reduce-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("build-tab")).not.toBeInTheDocument();
  });

  it("switches to the 'build' tab when tapped", async () => {
    const user = userEvent.setup();
    render(<Milestones />);
    await user.click(screen.getByRole("tab", { name: "common.tabs.build" }));
    expect(screen.getByTestId("build-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("reduce-tab")).not.toBeInTheDocument();
  });
});

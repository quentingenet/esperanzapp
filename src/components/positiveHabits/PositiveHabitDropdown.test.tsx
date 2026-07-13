import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PositiveHabitDropdown } from "./PositiveHabitDropdown";

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

describe("PositiveHabitDropdown", () => {
  it("shows 'custom' first, before the activity presets (mirrors HabitDropdown)", () => {
    render(
      <PositiveHabitDropdown
        selectedId={null}
        customLabel=""
        onSelect={vi.fn()}
        onCustomChange={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.getAttribute("aria-label"));
    expect(labels[0]).toBe("positiveHabitTypes.custom.label");
    expect(labels.indexOf("positiveHabitTypes.custom.label")).toBeLessThan(
      labels.indexOf("positiveHabitTypes.sport.label"),
    );
  });

  it("renders the tidying and healthyEating presets", () => {
    render(
      <PositiveHabitDropdown
        selectedId={null}
        customLabel=""
        onSelect={vi.fn()}
        onCustomChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "positiveHabitTypes.tidying.label" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "positiveHabitTypes.healthyEating.label" }),
    ).toBeInTheDocument();
  });

  it("does not render the retired hydration/sleep presets", () => {
    render(
      <PositiveHabitDropdown
        selectedId={null}
        customLabel=""
        onSelect={vi.fn()}
        onCustomChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "positiveHabitTypes.hydration.label" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "positiveHabitTypes.sleep.label" }),
    ).not.toBeInTheDocument();
  });
});

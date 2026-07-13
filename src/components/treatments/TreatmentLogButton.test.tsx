import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TreatmentLogButton } from "./TreatmentLogButton";

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

describe("TreatmentLogButton", () => {
  it("defaults to the treatments.* namespace when none is passed", () => {
    render(<TreatmentLogButton todayLog={null} onLog={vi.fn()} />);
    expect(screen.getByRole("button", { name: "treatments.taken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "treatments.missed" })).toBeInTheDocument();
  });

  it("uses the positiveHabits.* namespace when explicitly passed ('Fait'/'Non fait')", () => {
    render(<TreatmentLogButton todayLog={null} onLog={vi.fn()} namespace="positiveHabits" />);
    expect(screen.getByRole("button", { name: "positiveHabits.taken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "positiveHabits.missed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "treatments.taken" })).not.toBeInTheDocument();
  });

  it("calls onLog with 'taken' when the taken button is clicked", async () => {
    const onLog = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentLogButton todayLog={null} onLog={onLog} namespace="positiveHabits" />);
    await user.click(screen.getByRole("button", { name: "positiveHabits.taken" }));
    expect(onLog).toHaveBeenCalledWith("taken");
  });

  it("calls onLog with 'missed' when the missed button is clicked", async () => {
    const onLog = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentLogButton todayLog={null} onLog={onLog} namespace="positiveHabits" />);
    await user.click(screen.getByRole("button", { name: "positiveHabits.missed" }));
    expect(onLog).toHaveBeenCalledWith("missed");
  });

  it("highlights the taken button as contained when today's log status is 'taken'", () => {
    render(
      <TreatmentLogButton
        todayLog={{ status: "taken" }}
        onLog={vi.fn()}
        namespace="positiveHabits"
      />,
    );
    expect(screen.getByRole("button", { name: "positiveHabits.taken" })).toHaveClass(
      "MuiButton-contained",
    );
    expect(screen.getByRole("button", { name: "positiveHabits.missed" })).toHaveClass(
      "MuiButton-outlined",
    );
  });
});

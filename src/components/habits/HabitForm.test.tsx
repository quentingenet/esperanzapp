import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { enUS } from "date-fns/locale";
import { HabitForm } from "./HabitForm";
import { getHabitTypeConfig } from "@/utils/habitTypes";
import type { Habit } from "@/types";

vi.mock("@/hooks", () => ({
  useDateLocale: () => enUS,
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

const alcoholConfig = getHabitTypeConfig("alcohol")!;

const alcoholHabit: Habit = {
  id: "1",
  label: "Alcool",
  icon: alcoholConfig.svgPath,
  color: alcoholConfig.color,
  bgColor: alcoholConfig.bgColor,
  startDate: "2024-01-01",
  createdAt: "2024-01-01T00:00:00.000Z",
};

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "habits.add" }));
}

describe("HabitForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("FAB click opens the form drawer", async () => {
    const user = userEvent.setup();
    render(<HabitForm onSubmit={vi.fn()} existingHabits={[]} />);
    await openForm(user);
    expect(screen.getByRole("button", { name: "common.save" })).toBeInTheDocument();
  });

  it("submit button is disabled before selecting a habit type", async () => {
    const user = userEvent.setup();
    render(<HabitForm onSubmit={vi.fn()} existingHabits={[]} />);
    await openForm(user);
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("submit button is enabled after selecting a preset habit type", async () => {
    const user = userEvent.setup();
    render(<HabitForm onSubmit={vi.fn()} existingHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "habitTypes.alcohol.label" }));
    expect(screen.getByRole("button", { name: "common.save" })).not.toBeDisabled();
  });

  it("calls onSubmit with correct payload for a preset habit type", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<HabitForm onSubmit={onSubmit} existingHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "habitTypes.alcohol.label" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["label"]).toBe("habitTypes.alcohol.label");
    expect(typeof payload["icon"]).toBe("string");
    expect(String(payload["startDate"])).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("form resets and drawer closes after successful submit", async () => {
    const user = userEvent.setup();
    render(<HabitForm onSubmit={vi.fn()} existingHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "habitTypes.alcohol.label" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "common.save" })).not.toBeInTheDocument();
    });
  });

  it("shows duplicate warning and disables submit when habit type already exists", async () => {
    const user = userEvent.setup();
    render(<HabitForm onSubmit={vi.fn()} existingHabits={[alcoholHabit]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "habitTypes.alcohol.label" }));
    expect(screen.getByText("habits.duplicateWarning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("submit is disabled for custom type when label is empty", async () => {
    const user = userEvent.setup();
    render(<HabitForm onSubmit={vi.fn()} existingHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "habitTypes.custom.label" }));
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("submit is enabled for custom type when label is filled", async () => {
    const user = userEvent.setup();
    render(<HabitForm onSubmit={vi.fn()} existingHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "habitTypes.custom.label" }));
    await user.type(
      screen.getByRole("textbox", { name: "habitTypes.groups.custom" }),
      "Ma dépendance",
    );
    expect(screen.getByRole("button", { name: "common.save" })).not.toBeDisabled();
  });

  it("custom label is trimmed before being passed to onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<HabitForm onSubmit={onSubmit} existingHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "habitTypes.custom.label" }));
    await user.type(
      screen.getByRole("textbox", { name: "habitTypes.groups.custom" }),
      "  Ma dépendance  ",
    );
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0]![0] as Record<string, unknown>)["label"]).toBe("Ma dépendance");
  });
});

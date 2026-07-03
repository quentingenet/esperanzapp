import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { RelapseDialog } from "./RelapseDialog";
import type { Habit, HabitStats } from "@/types";

const tMap: Record<string, string> = {
  "relapse.messages.before7days": "{{name}}, ces {{days}} jours comptent. Tu recommences aujourd'hui.",
  "relapse.messages.between7and30days": "{{name}}, tu as tenu {{days}} jours. Ce n'est pas une défaite.",
  "relapse.messages.after30days": "{{name}}, tu as tenu {{days}} jours. C'est immense.",
  "relapse.messages.day0": "{{name}}, l'important c'est d'essayer.",
};

vi.mock("@/hooks", () => ({
  useDateLocale: () => undefined,
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        const template = tMap[key] ?? key;
        if (!opts) return template;
        return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
          const val = opts[k];
          return typeof val === "string" || typeof val === "number" ? String(val) : "";
        });
      },
    }),
  };
});


const habit: Habit = {
  id: "h1",
  label: "No alcohol",
  icon: "bottle",
  color: "#e53935",
  bgColor: "#ffebee",
  startDate: "2020-01-01",
  createdAt: "2020-01-01T00:00:00.000Z",
};

const stats: HabitStats = {
  currentStreak: 10,
  longestStreak: 30,
  totalRelapses: 2,
  averageStreak: 15,
  startDate: "2020-01-01",
};

function renderDialog(open: boolean, overrides: { onConfirm?: (d: string) => void; onCancel?: () => void } = {}) {
  return render(
    <RelapseDialog
      open={open}
      habit={habit}
      stats={stats}
      userName="Quentin"
      onConfirm={overrides.onConfirm ?? vi.fn()}
      onCancel={overrides.onCancel ?? vi.fn()}
    />,
  );
}

describe("RelapseDialog", () => {
  it("does not render when closed", () => {
    renderDialog(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title and action buttons when open", () => {
    renderDialog(true);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("relapse.confirmTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "relapse.cancelButton" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "relapse.confirmButton" })).toBeInTheDocument();
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderDialog(true, { onCancel });
    await user.click(screen.getByRole("button", { name: "relapse.cancelButton" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm with today in yyyy-MM-dd format by default", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog(true, { onConfirm });
    await user.click(screen.getByRole("button", { name: "relapse.confirmButton" }));
    expect(onConfirm).toHaveBeenCalledWith(format(new Date(), "yyyy-MM-dd"));
  });

  it("shows the date label above the calendar", () => {
    renderDialog(true);
    expect(screen.getByText("relapse.dateLabel")).toBeInTheDocument();
  });

  it("shows the motivational message with name when userName is set", () => {
    renderDialog(true);
    expect(screen.getByText(/Quentin, tu as tenu 10 jours/)).toBeInTheDocument();
  });

  it("removes leading comma and capitalizes when userName is empty", () => {
    render(
      <RelapseDialog
        open={true}
        habit={habit}
        stats={stats}
        userName=""
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const msg = screen.getByText((content) => content.includes("tenu 10 jours"));
    expect(msg.textContent).not.toMatch(/^,/);
    expect(msg.textContent).toMatch(/^[A-Z]/);
  });

  it("does not show a comma when userName is empty (day0 case)", () => {
    render(
      <RelapseDialog
        open={true}
        habit={habit}
        stats={{ ...stats, currentStreak: 0 }}
        userName=""
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const msg = screen.getByText((content) => content.includes("important"));
    expect(msg.textContent).not.toMatch(/^,/);
  });
});

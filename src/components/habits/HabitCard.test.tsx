import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HabitCard } from "./HabitCard";
import type { Habit, HabitStats, Grade } from "@/types";

vi.mock("@/hooks", () => ({
  useDateLocale: () => undefined,
}));

const i18nMap: Record<string, string> = {
  "habits.streak.year_one": "an",
  "habits.streak.year_other": "ans",
  "habits.streak.separator": "et",
  "habits.streak.total": "soit {{count}} jours",
  "common.day_one": "jour",
  "common.day_other": "jours",
  "grades.nextMilestone_one": "Prochain jalon : {{label}} dans {{count}} jour",
  "grades.nextMilestone_other": "Prochain jalon : {{label}} dans {{count}} jours",
  "common.delete": "Supprimer",
  "common.reorder": "Réordonner",
};

function mockT(key: string, opts?: Record<string, unknown>): string {
  let lookupKey = key;
  if (opts && typeof opts.count === "number") {
    const suffix = opts.count === 1 ? "_one" : "_other";
    const pluralKey = `${key}${suffix}`;
    if (pluralKey in i18nMap) lookupKey = pluralKey;
  }
  const template = i18nMap[lookupKey] ?? lookupKey;
  if (!opts) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
      const val = opts[k];
      return typeof val === "string" || typeof val === "number" ? String(val) : "";
    });
}

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({ t: mockT }),
  };
});

const habit: Habit = {
  id: "h1",
  label: "No alcohol",
  icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
  color: "#e53935",
  bgColor: "#ffebee",
  startDate: "2020-01-01",
  createdAt: "2020-01-01T00:00:00.000Z",
};

const grade: Grade = {
  days: 0,
  labelKey: "grades.starter",
  emoji: "🌱",
  messageKey: "grades.starter_msg",
  color: "#4caf50",
  bgColor: "#e8f5e9",
};

function makeStats(currentStreak: number, lastRelapseDate: string | null = null): HabitStats {
  return {
    currentStreak,
    longestStreak: currentStreak,
    totalRelapses: lastRelapseDate ? 1 : 0,
    averageStreak: currentStreak,
    startDate: "2020-01-01",
    lastRelapseDate,
    currentStreakStart: currentStreak > 0 ? "2020-01-01" : null,
  };
}

describe("HabitCard streak display", () => {
  it("shows raw day count for streaks under 365 days", () => {
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(42)}
        grade={grade}
        nextGrade={null}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows years and days for streaks >= 365 days", () => {
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(400)}
        grade={grade}
        nextGrade={null}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/1 an et 35 jours/)).toBeInTheDocument();
    expect(screen.getByText(/soit 400 jours/)).toBeInTheDocument();
  });

  it("shows only years when days mod 365 is 0", () => {
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(730)}
        grade={grade}
        nextGrade={null}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("2 ans")).toBeInTheDocument();
    expect(screen.getByText(/soit 730 jours/)).toBeInTheDocument();
  });

  it("shows last relapse date caption when lastRelapseDate is set", () => {
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(5, "2025-06-15")}
        grade={grade}
        nextGrade={null}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/habits.counter.lastRelapse/)).toBeInTheDocument();
  });

  it("does not show last relapse caption when lastRelapseDate is null", () => {
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(10)}
        grade={grade}
        nextGrade={null}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText(/lastRelapse/)).not.toBeInTheDocument();
  });

  it("uses plural 'ans' for 2 or more years", () => {
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(800)}
        grade={grade}
        nextGrade={null}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 ans/)).toBeInTheDocument();
  });

  it("shows nextMilestone text with singular day when 1 day remains", () => {
    const nextGrade = { grade: { ...grade, labelKey: "grades.oneWeek.label" }, daysLeft: 1 };
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(6)}
        grade={grade}
        nextGrade={nextGrade}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/dans 1 jour$/)).toBeInTheDocument();
    expect(screen.queryByText(/dans 1 jours/)).not.toBeInTheDocument();
  });

  it("shows nextMilestone text with plural days when multiple days remain", () => {
    const nextGrade = { grade: { ...grade, labelKey: "grades.oneMonth.label" }, daysLeft: 12 };
    render(
      <HabitCard
        habit={habit}
        stats={makeStats(18)}
        grade={grade}
        nextGrade={nextGrade}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/dans 12 jours/)).toBeInTheDocument();
  });

});

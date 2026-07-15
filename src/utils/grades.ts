import type { Grade } from "@/types";

export const GRADES: [Grade, ...Grade[]] = [
  {
    threshold: 1,
    labelKey: "grades.firstStep.label",
    emoji: "🌱",
    messageKey: "grades.messages.firstStep",
    color: "#2e7d32",
    bgColor: "#e8f5e9",
  },
  {
    threshold: 3,
    labelKey: "grades.alive.label",
    emoji: "🐣",
    messageKey: "grades.messages.alive",
    color: "#43a047",
    bgColor: "#e8f5e9",
  },
  {
    threshold: 7,
    labelKey: "grades.oneWeek.label",
    emoji: "🌿",
    messageKey: "grades.messages.oneWeek",
    color: "#558b2f",
    bgColor: "#f1f8e9",
  },
  {
    threshold: 14,
    labelKey: "grades.twoWeeks.label",
    emoji: "💪",
    messageKey: "grades.messages.twoWeeks",
    color: "#6d4c41",
    bgColor: "#efebe9",
  },
  {
    threshold: 21,
    labelKey: "grades.newHabit.label",
    emoji: "🧠",
    messageKey: "grades.messages.newHabit",
    color: "#546e7a",
    bgColor: "#eceff1",
  },
  {
    threshold: 30,
    labelKey: "grades.oneMonth.label",
    emoji: "🏅",
    messageKey: "grades.messages.oneMonth",
    color: "#37474f",
    bgColor: "#eceff1",
  },
  {
    threshold: 45,
    labelKey: "grades.inFlow.label",
    emoji: "🌊",
    messageKey: "grades.messages.inFlow",
    color: "#00695c",
    bgColor: "#e0f2f1",
  },
  {
    threshold: 60,
    labelKey: "grades.twoMonths.label",
    emoji: "🎯",
    messageKey: "grades.messages.twoMonths",
    color: "#1565c0",
    bgColor: "#e3f2fd",
  },
  {
    threshold: 75,
    labelKey: "grades.altitude.label",
    emoji: "🦅",
    messageKey: "grades.messages.altitude",
    color: "#004d40",
    bgColor: "#e0f2f1",
  },
  {
    threshold: 90,
    labelKey: "grades.threeMonths.label",
    emoji: "🔥",
    messageKey: "grades.messages.threeMonths",
    color: "#e64a19",
    bgColor: "#fbe9e7",
  },
  {
    threshold: 100,
    labelKey: "grades.century.label",
    emoji: "💯",
    messageKey: "grades.messages.century",
    color: "#f57f17",
    bgColor: "#fff8e1",
  },
  {
    threshold: 120,
    labelKey: "grades.fourMonths.label",
    emoji: "🌈",
    messageKey: "grades.messages.fourMonths",
    color: "#7b1fa2",
    bgColor: "#f3e5f5",
  },
  {
    threshold: 150,
    labelKey: "grades.halfway.label",
    emoji: "🦁",
    messageKey: "grades.messages.halfway",
    color: "#e65100",
    bgColor: "#fff3e0",
  },
  {
    threshold: 180,
    labelKey: "grades.metamorphosis.label",
    emoji: "🦋",
    messageKey: "grades.messages.metamorphosis",
    color: "#8b6ab5",
    bgColor: "#f3eef8",
  },
  {
    threshold: 250,
    labelKey: "grades.champion.label",
    emoji: "🏆",
    messageKey: "grades.messages.champion",
    color: "#b8960c",
    bgColor: "#fefae1",
  },
  {
    threshold: 300,
    labelKey: "grades.tenMonths.label",
    emoji: "🌙",
    messageKey: "grades.messages.tenMonths",
    color: "#283593",
    bgColor: "#e8eaf6",
  },
  {
    threshold: 365,
    labelKey: "grades.oneYear.label",
    emoji: "⭐",
    messageKey: "grades.messages.oneYear",
    color: "#e8a850",
    bgColor: "#fefaec",
  },
  {
    threshold: 500,
    labelKey: "grades.livingLegend.label",
    emoji: "🎸",
    messageKey: "grades.messages.livingLegend",
    color: "#0277bd",
    bgColor: "#e1f5fe",
  },
  {
    threshold: 730,
    labelKey: "grades.twoYears.label",
    emoji: "🌟",
    messageKey: "grades.messages.twoYears",
    color: "#e8b060",
    bgColor: "#fef8e8",
  },
  {
    threshold: 1000,
    labelKey: "grades.millennium.label",
    emoji: "🔮",
    messageKey: "grades.messages.millennium",
    color: "#4a148c",
    bgColor: "#f3e5f5",
  },
  {
    threshold: 1825,
    labelKey: "grades.fiveYears.label",
    emoji: "🎖️",
    messageKey: "grades.messages.fiveYears",
    color: "#b71c1c",
    bgColor: "#ffebee",
  },
  {
    threshold: 3650,
    labelKey: "grades.tenYears.label",
    emoji: "💎",
    messageKey: "grades.messages.tenYears",
    color: "#0d47a1",
    bgColor: "#e3f2fd",
  },
  {
    threshold: 7300,
    labelKey: "grades.twentyYears.label",
    emoji: "👑",
    messageKey: "grades.messages.twentyYears",
    color: "#827717",
    bgColor: "#f9fbe7",
  },
];

// `grades` defaults to GRADES (streak days) so every existing call site keeps its exact
// current behavior; pass POSITIVE_GRADES to compute against cumulative completion counts.
// The non-empty tuple type lets grades[0] be read safely, without a non-null assertion.
export function getGrade(value: number, grades: readonly [Grade, ...Grade[]] = GRADES): Grade {
  let current = grades[0];
  for (const grade of grades) {
    if (value >= grade.threshold) current = grade;
  }
  return current;
}

export function getNextGrade(
  value: number,
  grades: readonly [Grade, ...Grade[]] = GRADES,
): { grade: Grade; daysLeft: number } | null {
  for (const grade of grades) {
    if (value < grade.threshold) return { grade, daysLeft: grade.threshold - value };
  }
  return null;
}

export function getProgressToNext(
  value: number,
  grades: readonly [Grade, ...Grade[]] = GRADES,
): number {
  const next = getNextGrade(value, grades);
  if (!next) return 100;

  const current = getGrade(value, grades);
  const from = value >= current.threshold ? current.threshold : 0;
  const to = next.grade.threshold;

  const ratio = (value - from) / (to - from);
  return Math.min(100, Math.max(0, Math.floor(ratio * 100)));
}

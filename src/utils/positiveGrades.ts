import type { Grade } from "@/types";

// Count-based (cumulative "taken" completions), not day-based: a positive habit tracked
// weekly/monthly has no meaningful "streak of days" and a missed day should never erase
// progress — consistent with the app's "those days counted, start again" philosophy.
// Reuses the shared Grade type and the generalized getGrade/getNextGrade/getProgressToNext
// from grades.ts (pass this array explicitly instead of relying on the GRADES default).
export const POSITIVE_GRADES: [Grade, ...Grade[]] = [
  {
    threshold: 1,
    labelKey: "positiveGrades.seed.label",
    emoji: "🌱",
    messageKey: "positiveGrades.messages.seed",
    color: "#2e7d32",
    bgColor: "#e8f5e9",
  },
  {
    threshold: 3,
    labelKey: "positiveGrades.sprout.label",
    emoji: "🌿",
    messageKey: "positiveGrades.messages.sprout",
    color: "#43a047",
    bgColor: "#e8f5e9",
  },
  {
    threshold: 7,
    labelKey: "positiveGrades.roots.label",
    emoji: "🌳",
    messageKey: "positiveGrades.messages.roots",
    color: "#558b2f",
    bgColor: "#f1f8e9",
  },
  {
    threshold: 14,
    labelKey: "positiveGrades.momentum.label",
    emoji: "🚀",
    messageKey: "positiveGrades.messages.momentum",
    color: "#1565c0",
    bgColor: "#e3f2fd",
  },
  {
    threshold: 25,
    labelKey: "positiveGrades.habit.label",
    emoji: "💪",
    messageKey: "positiveGrades.messages.habit",
    color: "#6d4c41",
    bgColor: "#efebe9",
  },
  {
    threshold: 50,
    labelKey: "positiveGrades.bloom.label",
    emoji: "🌸",
    messageKey: "positiveGrades.messages.bloom",
    color: "#ad1457",
    bgColor: "#fce4ec",
  },
  {
    threshold: 100,
    labelKey: "positiveGrades.century.label",
    emoji: "💯",
    messageKey: "positiveGrades.messages.century",
    color: "#f57f17",
    bgColor: "#fff8e1",
  },
  {
    threshold: 200,
    labelKey: "positiveGrades.dedicated.label",
    emoji: "🏅",
    messageKey: "positiveGrades.messages.dedicated",
    color: "#37474f",
    bgColor: "#eceff1",
  },
  {
    threshold: 365,
    labelKey: "positiveGrades.oneYear.label",
    emoji: "⭐",
    messageKey: "positiveGrades.messages.oneYear",
    color: "#e8a850",
    bgColor: "#fefaec",
  },
  {
    threshold: 500,
    labelKey: "positiveGrades.unstoppable.label",
    emoji: "🔥",
    messageKey: "positiveGrades.messages.unstoppable",
    color: "#e64a19",
    bgColor: "#fbe9e7",
  },
  {
    threshold: 1000,
    labelKey: "positiveGrades.legend.label",
    emoji: "🏆",
    messageKey: "positiveGrades.messages.legend",
    color: "#b8960c",
    bgColor: "#fefae1",
  },
];

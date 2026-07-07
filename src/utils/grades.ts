import type { Grade } from "@/types";

export const GRADES: [Grade, ...Grade[]] = [
  { days: 1,    labelKey: "grades.firstStep.label",     emoji: "🌱", messageKey: "grades.messages.firstStep",     color: "#2e7d32", bgColor: "#e8f5e9" },
  { days: 3,    labelKey: "grades.alive.label",         emoji: "🐣", messageKey: "grades.messages.alive",         color: "#43a047", bgColor: "#e8f5e9" },
  { days: 7,    labelKey: "grades.oneWeek.label",       emoji: "🌿", messageKey: "grades.messages.oneWeek",       color: "#558b2f", bgColor: "#f1f8e9" },
  { days: 14,   labelKey: "grades.twoWeeks.label",      emoji: "💪", messageKey: "grades.messages.twoWeeks",      color: "#6d4c41", bgColor: "#efebe9" },
  { days: 21,   labelKey: "grades.newHabit.label",      emoji: "🧠", messageKey: "grades.messages.newHabit",      color: "#546e7a", bgColor: "#eceff1" },
  { days: 30,   labelKey: "grades.oneMonth.label",      emoji: "🏅", messageKey: "grades.messages.oneMonth",      color: "#37474f", bgColor: "#eceff1" },
  { days: 45,   labelKey: "grades.inFlow.label",        emoji: "🌊", messageKey: "grades.messages.inFlow",        color: "#00695c", bgColor: "#e0f2f1" },
  { days: 60,   labelKey: "grades.twoMonths.label",     emoji: "🎯", messageKey: "grades.messages.twoMonths",     color: "#1565c0", bgColor: "#e3f2fd" },
  { days: 75,   labelKey: "grades.altitude.label",      emoji: "🦅", messageKey: "grades.messages.altitude",      color: "#004d40", bgColor: "#e0f2f1" },
  { days: 90,   labelKey: "grades.threeMonths.label",   emoji: "🔥", messageKey: "grades.messages.threeMonths",   color: "#e64a19", bgColor: "#fbe9e7" },
  { days: 100,  labelKey: "grades.century.label",       emoji: "💯", messageKey: "grades.messages.century",       color: "#f57f17", bgColor: "#fff8e1" },
  { days: 120,  labelKey: "grades.fourMonths.label",    emoji: "🌈", messageKey: "grades.messages.fourMonths",    color: "#7b1fa2", bgColor: "#f3e5f5" },
  { days: 150,  labelKey: "grades.halfway.label",       emoji: "🦁", messageKey: "grades.messages.halfway",       color: "#e65100", bgColor: "#fff3e0" },
  { days: 180,  labelKey: "grades.metamorphosis.label", emoji: "🦋", messageKey: "grades.messages.metamorphosis", color: "#8b6ab5", bgColor: "#f3eef8" },
  { days: 250,  labelKey: "grades.champion.label",      emoji: "🏆", messageKey: "grades.messages.champion",      color: "#b8960c", bgColor: "#fefae1" },
  { days: 300,  labelKey: "grades.tenMonths.label",     emoji: "🌙", messageKey: "grades.messages.tenMonths",     color: "#283593", bgColor: "#e8eaf6" },
  { days: 365,  labelKey: "grades.oneYear.label",       emoji: "⭐", messageKey: "grades.messages.oneYear",       color: "#e8a850", bgColor: "#fefaec" },
  { days: 500,  labelKey: "grades.livingLegend.label",  emoji: "🎸", messageKey: "grades.messages.livingLegend",  color: "#0277bd", bgColor: "#e1f5fe" },
  { days: 730,  labelKey: "grades.twoYears.label",      emoji: "🌟", messageKey: "grades.messages.twoYears",      color: "#e8b060", bgColor: "#fef8e8" },
  { days: 1000, labelKey: "grades.millennium.label",    emoji: "🔮", messageKey: "grades.messages.millennium",    color: "#4a148c", bgColor: "#f3e5f5" },
];

export function getGrade(days: number): Grade {
  let current = GRADES[0];
  for (const grade of GRADES) {
    if (days >= grade.days) current = grade;
  }
  return current;
}

export function getNextGrade(days: number): { grade: Grade; daysLeft: number } | null {
  for (const grade of GRADES) {
    if (days < grade.days) return { grade, daysLeft: grade.days - days };
  }
  return null;
}

export function getProgressToNext(days: number): number {
  const next = getNextGrade(days);
  if (!next) return 100;

  const current = getGrade(days);
  const fromDays = days >= current.days ? current.days : 0;
  const toDays = next.grade.days;

  const ratio = (days - fromDays) / (toDays - fromDays);
  return Math.min(100, Math.max(0, Math.floor(ratio * 100)));
}

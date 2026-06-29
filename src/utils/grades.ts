import type { Grade } from "@/types";

export const GRADES: Grade[] = [
  { days: 1,   labelKey: "grades.awakening.label",          emoji: "🌱", messageKey: "grades.messages.awakening",          color: "#2e7d32", bgColor: "#e8f5e9" },
  { days: 7,   labelKey: "grades.firstBreath.label",        emoji: "🌿", messageKey: "grades.messages.firstBreath",        color: "#558b2f", bgColor: "#f1f8e9" },
  { days: 14,  labelKey: "grades.anchoring.label",          emoji: "🪨", messageKey: "grades.messages.anchoring",          color: "#5d4037", bgColor: "#efebe9" },
  { days: 30,  labelKey: "grades.solidity.label",           emoji: "🏔️", messageKey: "grades.messages.solidity",          color: "#455a64", bgColor: "#eceff1" },
  { days: 60,  labelKey: "grades.clarity.label",            emoji: "💧", messageKey: "grades.messages.clarity",            color: "#1565c0", bgColor: "#e3f2fd" },
  { days: 90,  labelKey: "grades.mastery.label",            emoji: "🔥", messageKey: "grades.messages.mastery",            color: "#e09050", bgColor: "#fef6ec" },
  { days: 180, labelKey: "grades.freedom.label",            emoji: "🦋", messageKey: "grades.messages.freedom",            color: "#8b6ab5", bgColor: "#f3eef8" },
  { days: 365, labelKey: "grades.fulfilledAwakening.label", emoji: "⭐", messageKey: "grades.messages.fulfilledAwakening", color: "#e8a850", bgColor: "#fefaec" },
  { days: 730, labelKey: "grades.legend.label",             emoji: "🌟", messageKey: "grades.messages.legend",             color: "#e8b060", bgColor: "#fef8e8" },
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

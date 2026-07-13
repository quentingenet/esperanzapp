import type { PositiveHabitTypeConfig, PositiveHabitTypeId } from "@/types";

export const POSITIVE_HABIT_TYPES: PositiveHabitTypeConfig[] = [
  {
    id: "sport",
    group: "activities",
    color: "#2e7d32",
    bgColor: "#e8f5e9",
    svgPath:
      "M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z",
  },
  {
    id: "reading",
    group: "activities",
    color: "#1565c0",
    bgColor: "#e3f2fd",
    svgPath:
      "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
  },
  {
    id: "meditation",
    group: "activities",
    color: "#7b1fa2",
    bgColor: "#f3e5f5",
    svgPath:
      "M12 22c4.97 0 9-1.79 9-4 0-1.47-1.79-2.75-4.44-3.44.03-.18.06-.37.09-.56H7.35c.03.19.05.38.09.56C4.79 15.25 3 16.53 3 18c0 1.79 4.03 4 9 4zm5.5-11.03c.86-1.03 1.5-2.2 1.5-3.47C19 3.5 15.87 1 12 1S5 3.5 5 7.5c0 1.27.64 2.44 1.5 3.47C4.53 12.06 3 14.09 3 15.5h18c0-1.41-1.53-3.44-3.5-4.53z",
  },
  {
    id: "tidying",
    group: "activities",
    color: "#5d4037",
    bgColor: "#efebe9",
    svgPath:
      "M22 7h-9v2h9V7zm0 8h-9v2h9v-2zM5.54 11L2 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 11zm0 8L2 15.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 19z",
  },
  {
    id: "healthyEating",
    group: "activities",
    color: "#e65100",
    bgColor: "#fff3e0",
    svgPath:
      "M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z",
  },
  {
    id: "custom",
    group: "custom",
    color: "#546e7a",
    bgColor: "#eceff1",
    svgPath:
      "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  },
];

export function getPositiveHabitTypeConfig(
  id: PositiveHabitTypeId,
): PositiveHabitTypeConfig | undefined {
  return POSITIVE_HABIT_TYPES.find((h) => h.id === id);
}

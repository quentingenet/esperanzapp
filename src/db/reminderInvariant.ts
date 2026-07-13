import type { Frequency } from "@/types";

// Shared by Treatment and PositiveHabit: both couple frequency to reminderDay identically.
export function validateReminderInvariant(
  entity: string,
  frequency: Frequency,
  reminderDay: number | null,
): void {
  if (frequency === "daily" && reminderDay !== null)
    throw new Error(
      `${entity} invariant violated: daily must have reminderDay null, got ${String(reminderDay)}`,
    );
  if (frequency === "weekly" && (reminderDay === null || reminderDay < 0 || reminderDay > 6))
    throw new Error(
      `${entity} invariant violated: weekly must have reminderDay 0 to 6, got ${String(reminderDay)}`,
    );
  if (
    frequency === "monthly" &&
    (reminderDay === null || (reminderDay !== 0 && (reminderDay < 1 || reminderDay > 28)))
  )
    throw new Error(
      `${entity} invariant violated: monthly must have reminderDay 0 or 1 to 28, got ${String(reminderDay)}`,
    );
}

export function validatePartialReminderDay(fnName: string, reminderDay: number): void {
  if (!Number.isInteger(reminderDay) || reminderDay < 0 || reminderDay > 28)
    throw new Error(`${fnName}: reminderDay must be null or 0 to 28, got ${String(reminderDay)}`);
}

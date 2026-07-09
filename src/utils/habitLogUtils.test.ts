import { describe, it, expect } from "vitest";
import { mergeRelapseRestart } from "./habitLogUtils";
import type { HabitLog } from "@/types";

function log(
  id: string,
  habitId: string,
  eventType: "start" | "relapse",
  eventDate: string,
): HabitLog {
  return { id, habitId, eventType, eventDate };
}

describe("mergeRelapseRestart", () => {
  it("returns empty array for empty input", () => {
    expect(mergeRelapseRestart([])).toEqual([]);
  });

  it("passes through start event unchanged when no same-day relapse", () => {
    const result = mergeRelapseRestart([log("1", "h1", "start", "2024-01-01")]);
    expect(result).toHaveLength(1);
    expect(result[0]!.eventType).toBe("start");
    expect(result[0]!.displayKey).toBeUndefined();
  });

  it("marks any relapse as relapseRestart (relapse always implies restart in app flow)", () => {
    const result = mergeRelapseRestart([log("1", "h1", "relapse", "2024-01-05")]);
    expect(result).toHaveLength(1);
    expect(result[0]!.displayKey).toBe("history.relapseRestart");
  });

  it("filters same-day start and marks relapse as relapseRestart", () => {
    const input = [log("1", "h1", "relapse", "2024-01-05"), log("2", "h1", "start", "2024-01-05")];
    const result = mergeRelapseRestart(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.eventType).toBe("relapse");
    expect(result[0]!.displayKey).toBe("history.relapseRestart");
  });

  it("keeps start on a different day and does not add displayKey to it", () => {
    const input = [log("1", "h1", "start", "2024-01-01"), log("2", "h1", "relapse", "2024-01-10")];
    const result = mergeRelapseRestart(input);
    expect(result).toHaveLength(2);
    const startEntry = result.find((r) => r.eventType === "start");
    expect(startEntry!.displayKey).toBeUndefined();
  });

  it("does not filter start of a different habit when another habit has a same-day relapse", () => {
    const input = [log("1", "h1", "relapse", "2024-01-05"), log("2", "h2", "start", "2024-01-05")];
    const result = mergeRelapseRestart(input);
    expect(result).toHaveLength(2);
    const h2Entry = result.find((r) => r.habitId === "h2");
    expect(h2Entry!.eventType).toBe("start");
    expect(h2Entry!.displayKey).toBeUndefined();
  });

  it("preserves extra fields from subtype", () => {
    const input = [
      {
        id: "1",
        habitId: "h1",
        eventType: "relapse" as const,
        eventDate: "2024-01-05",
        habitLabel: "Smoking",
        habitColor: "#ff0000",
      },
      {
        id: "2",
        habitId: "h1",
        eventType: "start" as const,
        eventDate: "2024-01-05",
        habitLabel: "Smoking",
        habitColor: "#ff0000",
      },
    ];
    const result = mergeRelapseRestart(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.habitLabel).toBe("Smoking");
    expect(result[0]!.displayKey).toBe("history.relapseRestart");
  });

  it("handles multiple relapse+restart pairs on different days", () => {
    const input = [
      log("1", "h1", "relapse", "2024-02-01"),
      log("2", "h1", "start", "2024-02-01"),
      log("3", "h1", "relapse", "2024-03-01"),
      log("4", "h1", "start", "2024-03-01"),
    ];
    const result = mergeRelapseRestart(input);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.displayKey === "history.relapseRestart")).toBe(true);
  });
});

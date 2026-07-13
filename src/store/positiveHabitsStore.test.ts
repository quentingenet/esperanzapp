import { describe, it, expect, beforeEach } from "vitest";
import { usePositiveHabitsStore } from "./positiveHabitsStore";
import type { PositiveHabit } from "@/types";

const h1: PositiveHabit = {
  id: "1",
  label: "Course à pied",
  icon: "M...",
  color: "#2e7d32",
  bgColor: "#e8f5e9",
  frequency: "weekly",
  reminderTime: "07:00",
  reminderEnabled: true,
  reminderDay: 1,
  createdAt: "2024-01-01T10:00:00.000Z",
};

const h2: PositiveHabit = { ...h1, id: "2", label: "Lecture" };

describe("positiveHabitsStore", () => {
  beforeEach(() => {
    usePositiveHabitsStore.setState({ positiveHabits: [], loading: false });
  });

  it("initial state", () => {
    const s = usePositiveHabitsStore.getState();
    expect(s.positiveHabits).toEqual([]);
    expect(s.loading).toBe(false);
  });

  it("setPositiveHabits replaces array", () => {
    usePositiveHabitsStore.getState().setPositiveHabits([h1, h2]);
    expect(usePositiveHabitsStore.getState().positiveHabits).toEqual([h1, h2]);
  });

  it("addPositiveHabit appends", () => {
    usePositiveHabitsStore.getState().addPositiveHabit(h1);
    expect(usePositiveHabitsStore.getState().positiveHabits).toHaveLength(1);
    expect(usePositiveHabitsStore.getState().positiveHabits[0]).toEqual(h1);
  });

  it("removePositiveHabit filters by id", () => {
    usePositiveHabitsStore.getState().setPositiveHabits([h1, h2]);
    usePositiveHabitsStore.getState().removePositiveHabit("1");
    expect(usePositiveHabitsStore.getState().positiveHabits).toHaveLength(1);
    expect(usePositiveHabitsStore.getState().positiveHabits[0]!.id).toBe("2");
  });

  it("updatePositiveHabit updates matching habit in place", () => {
    usePositiveHabitsStore.getState().setPositiveHabits([h1, h2]);
    usePositiveHabitsStore.getState().updatePositiveHabit("1", { label: "Updated" });
    const { positiveHabits } = usePositiveHabitsStore.getState();
    expect(positiveHabits[0]?.label).toBe("Updated");
    expect(positiveHabits[1]?.label).toBe("Lecture");
  });

  it("updatePositiveHabit is a no-op for unknown id", () => {
    usePositiveHabitsStore.getState().setPositiveHabits([h1]);
    usePositiveHabitsStore.getState().updatePositiveHabit("999", { label: "Ghost" });
    expect(usePositiveHabitsStore.getState().positiveHabits[0]?.label).toBe("Course à pied");
  });
});

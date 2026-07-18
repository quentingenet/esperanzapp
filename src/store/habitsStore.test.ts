import { describe, it, expect, beforeEach } from "vitest";
import { useHabitsStore } from "./habitsStore";
import type { Habit } from "@/types";

const h1: Habit = {
  id: "1",
  label: "Alcool",
  icon: "🍺",
  color: "#3a8fd1",
  bgColor: "#e8f4ff",
  startDate: "2024-01-01",
  createdAt: "2024-01-01T10:00:00.000Z",
};

const h2: Habit = { ...h1, id: "2", label: "Tabac" };

describe("habitsStore", () => {
  beforeEach(() => {
    useHabitsStore.setState({ habits: [], loading: false, error: null });
  });

  it("initial state", () => {
    const s = useHabitsStore.getState();
    expect(s.habits).toEqual([]);
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it("setHabits replaces array", () => {
    useHabitsStore.getState().setHabits([h1, h2]);
    expect(useHabitsStore.getState().habits).toEqual([h1, h2]);
  });

  it("addHabit appends", () => {
    useHabitsStore.getState().addHabit(h1);
    useHabitsStore.getState().addHabit(h2);
    expect(useHabitsStore.getState().habits).toHaveLength(2);
  });

  it("removeHabit filters by id", () => {
    useHabitsStore.getState().setHabits([h1, h2]);
    useHabitsStore.getState().removeHabit("1");
    const habits = useHabitsStore.getState().habits;
    expect(habits).toHaveLength(1);
    expect(habits[0]!.id).toBe("2");
  });

  it("updateHabit patches the matching habit by id", () => {
    useHabitsStore.getState().setHabits([h1, h2]);
    useHabitsStore.getState().updateHabit("1", { label: "Renamed" });
    const habits = useHabitsStore.getState().habits;
    expect(habits[0]!.label).toBe("Renamed");
    expect(habits[1]!.label).toBe("Tabac");
  });

  it("updateHabit with unknown id leaves state unchanged", () => {
    useHabitsStore.getState().setHabits([h1]);
    useHabitsStore.getState().updateHabit("999", { label: "Renamed" });
    expect(useHabitsStore.getState().habits).toEqual([h1]);
  });

  it("removeHabit with unknown id leaves state unchanged", () => {
    useHabitsStore.getState().setHabits([h1]);
    useHabitsStore.getState().removeHabit("999");
    expect(useHabitsStore.getState().habits).toHaveLength(1);
  });
});

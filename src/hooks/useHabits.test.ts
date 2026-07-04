import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHabits } from "./useHabits";
import { useHabitsStore } from "@/store/habitsStore";
import { getAllHabits, createHabitWithInitialLog, deleteHabit } from "@/db";
import type { Habit } from "@/types";

vi.mock("@/db", () => ({
  getAllHabits: vi.fn(),
  createHabitWithInitialLog: vi.fn(),
  deleteHabit: vi.fn(),
}));

const habit: Habit = {
  id: "1",
  label: "Alcool",
  icon: "🍺",
  color: "#3a8fd1",
  bgColor: "#e8f4ff",
  startDate: "2024-01-01",
  createdAt: "2024-01-01T10:00:00.000Z",
};

const habitData: Omit<Habit, "id"> = {
  label: "Alcool",
  icon: "🍺",
  color: "#3a8fd1",
  bgColor: "#e8f4ff",
  startDate: "2024-01-01",
  createdAt: "2024-01-01T10:00:00.000Z",
};

describe("useHabits", () => {
  beforeEach(() => {
    useHabitsStore.setState({ habits: [], loading: false, error: null });
    vi.mocked(getAllHabits).mockResolvedValue([]);
    vi.mocked(createHabitWithInitialLog).mockResolvedValue(habit);
    vi.mocked(deleteHabit).mockResolvedValue(undefined);
  });

  it("loadHabits sets habits from DB", async () => {
    vi.mocked(getAllHabits).mockResolvedValueOnce([habit]);
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.loadHabits();
    });
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0]!.label).toBe("Alcool");
  });

  it("loadHabits sets error on DB failure", async () => {
    vi.mocked(getAllHabits).mockRejectedValueOnce(new Error("DB error"));
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.loadHabits();
    });
    expect(result.current.error).toBe("DB error");
  });

  it("loadHabits resets loading to false after success", async () => {
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.loadHabits();
    });
    expect(result.current.loading).toBe(false);
  });

  it("addHabitWithInitialLog creates both records atomically and updates the store", async () => {
    const { result } = renderHook(() => useHabits());
    let created: Habit | undefined;
    await act(async () => {
      created = await result.current.addHabitWithInitialLog(habitData);
    });
    expect(createHabitWithInitialLog).toHaveBeenCalledWith(habitData, habitData.startDate);
    expect(created).toEqual(habit);
    expect(result.current.habits).toEqual([habit]);
  });

  it("deleteHabit removes from DB and store", async () => {
    useHabitsStore.setState({ habits: [habit] });
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.deleteHabit("1");
    });
    expect(deleteHabit).toHaveBeenCalledWith("1");
    expect(result.current.habits).toHaveLength(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

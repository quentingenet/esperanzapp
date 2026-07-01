import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHabits } from "./useHabits";
import { useHabitsStore } from "@/store/habitsStore";
import { getAllHabits, createHabit, deleteHabit } from "@/db";
import type { Habit } from "@/types";

vi.mock("@/db", () => ({
  getAllHabits: vi.fn(),
  createHabit: vi.fn(),
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
    vi.mocked(createHabit).mockResolvedValue(habit);
    vi.mocked(deleteHabit).mockResolvedValue(undefined);
  });

  it("loadHabits sets habits from DB", async () => {
    vi.mocked(getAllHabits).mockResolvedValueOnce([habit]);
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.loadHabits();
    });
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].label).toBe("Alcool");
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

  it("addHabit creates habit and adds to store", async () => {
    const { result } = renderHook(() => useHabits());
    let created: Habit | undefined;
    await act(async () => {
      created = await result.current.addHabit(habitData);
    });
    expect(createHabit).toHaveBeenCalledWith(habitData);
    expect(created).toEqual(habit);
    expect(result.current.habits).toHaveLength(1);
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

  it("getDayCount returns 0 for unknown habitId", () => {
    const { result } = renderHook(() => useHabits());
    expect(result.current.getDayCount("999")).toBe(0);
  });

  it("getDayCount computes days since habit startDate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
    useHabitsStore.setState({ habits: [habit] });
    const { result } = renderHook(() => useHabits());
    expect(result.current.getDayCount("1")).toBe(14);
    vi.useRealTimers();
  });

  it("getDayCount never returns a negative value (future startDate in DB)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
    const futureHabit = { ...habit, startDate: "2024-12-31" };
    useHabitsStore.setState({ habits: [futureHabit] });
    const { result } = renderHook(() => useHabits());
    expect(result.current.getDayCount("1")).toBe(0);
    vi.useRealTimers();
  });

  it("addHabit rejects a future startDate", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
    vi.mocked(createHabit).mockClear();
    const { result } = renderHook(() => useHabits());
    await expect(
      act(async () => {
        await result.current.addHabit({ ...habitData, startDate: "2024-12-31" });
      }),
    ).rejects.toThrow("startDate cannot be in the future");
    expect(createHabit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("addHabit accepts today's date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
    vi.mocked(createHabit).mockClear();
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.addHabit({ ...habitData, startDate: "2024-01-01" });
    });
    expect(createHabit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("addHabit accepts a past date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
    vi.mocked(createHabit).mockClear();
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.addHabit({ ...habitData, startDate: "2024-01-01" });
    });
    expect(createHabit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

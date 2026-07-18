import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHabits } from "./useHabits";
import { useHabitsStore } from "@/store/habitsStore";
import {
  getAllHabits,
  createHabitWithInitialLog,
  updateHabit,
  deleteHabit,
  updateHabitsSortOrder,
} from "@/db";
import type { Habit } from "@/types";

vi.mock("@/db", () => ({
  getAllHabits: vi.fn(),
  createHabitWithInitialLog: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  updateHabitsSortOrder: vi.fn(),
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

const habitB: Habit = { ...habit, id: "2", label: "Tabac" };
const habitC: Habit = { ...habit, id: "3", label: "Cannabis" };

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
    vi.clearAllMocks();
    useHabitsStore.setState({ habits: [], loading: false, error: null });
    vi.mocked(getAllHabits).mockResolvedValue([]);
    vi.mocked(createHabitWithInitialLog).mockResolvedValue(habit);
    vi.mocked(updateHabit).mockResolvedValue(undefined);
    vi.mocked(deleteHabit).mockResolvedValue(undefined);
    vi.mocked(updateHabitsSortOrder).mockResolvedValue(undefined);
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

  it("editHabit updates the DB and the store", async () => {
    useHabitsStore.setState({ habits: [habit] });
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.editHabit("1", { label: "Nouveau nom" });
    });
    expect(updateHabit).toHaveBeenCalledWith("1", { label: "Nouveau nom" });
    expect(result.current.habits[0]!.label).toBe("Nouveau nom");
  });

  it("editHabit propagates DB failure without updating the store", async () => {
    useHabitsStore.setState({ habits: [habit] });
    vi.mocked(updateHabit).mockRejectedValueOnce(new Error("cannot rename a non-custom habit"));
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await expect(result.current.editHabit("1", { label: "Nouveau nom" })).rejects.toThrow(
        "cannot rename a non-custom habit",
      );
    });
    expect(result.current.habits[0]!.label).toBe("Alcool");
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

  it("addHabitWithInitialLog throws when startDate is in the future", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T10:00:00.000Z"));
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await expect(
        result.current.addHabitWithInitialLog({ ...habitData, startDate: "2024-06-15" }),
      ).rejects.toThrow("startDate cannot be in the future");
    });
    expect(createHabitWithInitialLog).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("reorderHabits reorders habits in the store according to the given id list", () => {
    useHabitsStore.setState({ habits: [habit, habitB, habitC] });
    const { result } = renderHook(() => useHabits());
    act(() => {
      result.current.reorderHabits(["2", "3", "1"]);
    });
    expect(result.current.habits.map((h) => h.id)).toEqual(["2", "3", "1"]);
  });

  it("reorderHabits preserves habits absent from orderedIds at the end of the list", () => {
    useHabitsStore.setState({ habits: [habit, habitB, habitC] });
    const { result } = renderHook(() => useHabits());
    act(() => {
      result.current.reorderHabits(["3", "1"]); // habitB (id=2) is absent
    });
    expect(result.current.habits.map((h) => h.id)).toEqual(["3", "1", "2"]);
  });

  it("saveHabitsOrder calls updateHabitsSortOrder with current habits id order", async () => {
    useHabitsStore.setState({ habits: [habitB, habit, habitC] });
    const { result } = renderHook(() => useHabits());
    await act(async () => {
      await result.current.saveHabitsOrder();
    });
    expect(updateHabitsSortOrder).toHaveBeenCalledWith(["2", "1", "3"]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

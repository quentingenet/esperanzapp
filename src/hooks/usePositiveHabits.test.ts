import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePositiveHabits } from "./usePositiveHabits";
import { usePositiveHabitsStore } from "@/store/positiveHabitsStore";
import {
  getAllPositiveHabits,
  createPositiveHabit,
  deletePositiveHabit,
  updatePositiveHabit,
  updatePositiveHabitsSortOrder,
} from "@/db";
import type { PositiveHabit } from "@/types";

vi.mock("@/db", () => ({
  getAllPositiveHabits: vi.fn(),
  createPositiveHabit: vi.fn(),
  deletePositiveHabit: vi.fn(),
  updatePositiveHabit: vi.fn(),
  updatePositiveHabitsSortOrder: vi.fn(),
}));

const positiveHabit: PositiveHabit = {
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

const positiveHabitB: PositiveHabit = { ...positiveHabit, id: "2", label: "Lecture" };
const positiveHabitC: PositiveHabit = { ...positiveHabit, id: "3", label: "Méditation" };

const positiveHabitData: Omit<PositiveHabit, "id"> = {
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

describe("usePositiveHabits", () => {
  beforeEach(() => {
    usePositiveHabitsStore.setState({ positiveHabits: [], loading: false });
    vi.mocked(getAllPositiveHabits).mockResolvedValue([]);
    vi.mocked(createPositiveHabit).mockResolvedValue(positiveHabit);
    vi.mocked(deletePositiveHabit).mockResolvedValue(undefined);
    vi.mocked(updatePositiveHabit).mockResolvedValue(undefined);
    vi.mocked(updatePositiveHabitsSortOrder).mockResolvedValue(undefined);
  });

  it("loadPositiveHabits sets positive habits from DB", async () => {
    vi.mocked(getAllPositiveHabits).mockResolvedValueOnce([positiveHabit]);
    const { result } = renderHook(() => usePositiveHabits());
    await act(async () => {
      await result.current.loadPositiveHabits();
    });
    expect(result.current.positiveHabits).toHaveLength(1);
    expect(result.current.positiveHabits[0]!.label).toBe("Course à pied");
  });

  it("loadPositiveHabits resets loading to false", async () => {
    const { result } = renderHook(() => usePositiveHabits());
    await act(async () => {
      await result.current.loadPositiveHabits();
    });
    expect(result.current.loading).toBe(false);
  });

  it("addPositiveHabit creates and stores", async () => {
    const { result } = renderHook(() => usePositiveHabits());
    let created: PositiveHabit | undefined;
    await act(async () => {
      created = await result.current.addPositiveHabit(positiveHabitData);
    });
    expect(createPositiveHabit).toHaveBeenCalledWith(positiveHabitData);
    expect(created).toEqual(positiveHabit);
    expect(result.current.positiveHabits).toHaveLength(1);
  });

  it("deletePositiveHabit removes from DB and store", async () => {
    usePositiveHabitsStore.setState({ positiveHabits: [positiveHabit] });
    const { result } = renderHook(() => usePositiveHabits());
    await act(async () => {
      await result.current.deletePositiveHabit("1");
    });
    expect(deletePositiveHabit).toHaveBeenCalledWith("1");
    expect(result.current.positiveHabits).toHaveLength(0);
  });

  it("editPositiveHabit updates DB and store", async () => {
    usePositiveHabitsStore.setState({ positiveHabits: [positiveHabit] });
    const { result } = renderHook(() => usePositiveHabits());
    await act(async () => {
      await result.current.editPositiveHabit("1", {
        label: "Course à pied (matin)",
        icon: "M...",
        color: "#2e7d32",
        bgColor: "#e8f5e9",
        reminderTime: "06:30",
        reminderEnabled: true,
        reminderDay: 1,
      });
    });
    expect(updatePositiveHabit).toHaveBeenCalledWith("1", {
      label: "Course à pied (matin)",
      icon: "M...",
      color: "#2e7d32",
      bgColor: "#e8f5e9",
      reminderTime: "06:30",
      reminderEnabled: true,
      reminderDay: 1,
    });
    expect(result.current.positiveHabits[0]!.label).toBe("Course à pied (matin)");
    expect(result.current.positiveHabits[0]!.reminderTime).toBe("06:30");
  });

  it("reorderPositiveHabits reorders positive habits in the store according to the given id list", () => {
    usePositiveHabitsStore.setState({
      positiveHabits: [positiveHabit, positiveHabitB, positiveHabitC],
    });
    const { result } = renderHook(() => usePositiveHabits());
    act(() => {
      result.current.reorderPositiveHabits(["2", "3", "1"]);
    });
    expect(result.current.positiveHabits.map((h) => h.id)).toEqual(["2", "3", "1"]);
  });

  it("reorderPositiveHabits preserves positive habits absent from orderedIds at the end", () => {
    usePositiveHabitsStore.setState({
      positiveHabits: [positiveHabit, positiveHabitB, positiveHabitC],
    });
    const { result } = renderHook(() => usePositiveHabits());
    act(() => {
      result.current.reorderPositiveHabits(["3", "1"]); // positiveHabitB (id=2) absent
    });
    expect(result.current.positiveHabits.map((h) => h.id)).toEqual(["3", "1", "2"]);
  });

  it("savePositiveHabitsOrder calls updatePositiveHabitsSortOrder with current id order", async () => {
    usePositiveHabitsStore.setState({
      positiveHabits: [positiveHabitB, positiveHabit, positiveHabitC],
    });
    const { result } = renderHook(() => usePositiveHabits());
    await act(async () => {
      await result.current.savePositiveHabitsOrder();
    });
    expect(updatePositiveHabitsSortOrder).toHaveBeenCalledWith(["2", "1", "3"]);
  });
});

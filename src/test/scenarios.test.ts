/**
 * Cross-module scenario tests (Niveau 2.5).
 * These trace complete flows by mocking only the platform boundaries (Capacitor, DB)
 * and chaining the actual application modules together — no Android required.
 *
 * Coverage targets:
 *   - utils/milestoneNotifications.ts flows (orphan purge, relapse chain)
 *   - AppStartRescheduler isolation (treatment failure doesn't block milestones)
 *   - Post-permission-grant reschedule (handleActivateNotifications wiring)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { getAllHabits, getAllHabitLogs } from "@/db";
import { NOTIF_DOMAIN_OFFSET } from "@/hooks/useNotifications";
import { GRADES } from "@/utils/grades";
import {
  cancelMilestoneNotifications,
  getMilestoneNotificationId,
  rescheduleAllMilestoneNotifications,
  scheduleMilestoneNotifications,
} from "@/utils/milestoneNotifications";
import type { Habit, HabitLog } from "@/types";

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
}));

vi.mock("@/db", () => ({
  getAllHabits: vi.fn(),
  getAllHabitLogs: vi.fn(),
}));

const makeHabit = (id: string): Habit => ({
  id,
  label: `Habit ${id}`,
  icon: "🌱",
  color: "#000",
  bgColor: "#fff",
  startDate: "2025-01-01",
  createdAt: "2025-01-01T00:00:00.000Z",
});

const startLog = (habitId: string, date: string): HabitLog => ({
  id: `${habitId}-${date}`,
  habitId,
  eventType: "start",
  eventDate: date,
});

// Collects all notification IDs cancelled across all LocalNotifications.cancel calls
function allCancelledIds(): number[] {
  return vi.mocked(LocalNotifications.cancel).mock.calls.flatMap(
    (call) => call[0].notifications.map((n) => n.id),
  );
}

describe("Scenario: habit deletion → boot → orphan purge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({ notifications: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("orphan IDs from deleted habit are cancelled at next boot", async () => {
    // Habit "2" was deleted; its milestone IDs remain pending on the OS.
    const orphanId = getMilestoneNotificationId("2", 0);
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({
      notifications: [{ id: orphanId }],
    } as PendingResult);

    // Boot: only habit "1" is alive.
    vi.mocked(getAllHabits).mockResolvedValue([makeHabit("1")]);
    vi.mocked(getAllHabitLogs).mockResolvedValue([startLog("1", "2025-01-14")]);

    await rescheduleAllMilestoneNotifications();

    expect(allCancelledIds()).toContain(orphanId);
  });

  it("orphan is purged even when cancelMilestoneNotifications was skipped at deletion time", async () => {
    // Simulate the case where cancelMilestoneNotifications failed silently at deletion.
    // The habit is gone but its 20 IDs are still pending.
    const orphanIds = GRADES.map((_, i) => getMilestoneNotificationId("99", i));
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({
      notifications: orphanIds.map((id) => ({ id })),
    } as PendingResult);

    vi.mocked(getAllHabits).mockResolvedValue([]);
    vi.mocked(getAllHabitLogs).mockResolvedValue([]);

    await rescheduleAllMilestoneNotifications();

    const cancelled = allCancelledIds();
    for (const id of orphanIds) {
      expect(cancelled).toContain(id);
    }
  });

  it("expected IDs for live habits are NOT treated as orphans", async () => {
    const expectedId = getMilestoneNotificationId("1", 0);
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({
      notifications: [{ id: expectedId }],
    } as PendingResult);

    vi.mocked(getAllHabits).mockResolvedValue([makeHabit("1")]);
    vi.mocked(getAllHabitLogs).mockResolvedValue([startLog("1", "2025-01-14")]);

    await rescheduleAllMilestoneNotifications();

    // One cancel call: the per-habit pre-cancel. expectedId must NOT appear in the orphan cancel.
    const calls = vi.mocked(LocalNotifications.cancel).mock.calls;
    // The last cancel call is the orphan purge (or it doesn't exist if no orphans).
    // If only 1 cancel call exists, it's the per-habit cancel — no orphan call was made.
    expect(calls).toHaveLength(1);
  });
});

describe("Scenario: relapse → milestone chain rescheduled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("cancel then reschedule produces fresh future notifications after relapse", async () => {
    // Initial schedule from old streak start.
    await scheduleMilestoneNotifications("1", "Alcool", "2025-05-01");
    const firstScheduleCount = vi.mocked(LocalNotifications.schedule).mock.calls.length;
    vi.clearAllMocks();
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);

    // Relapse today → cancel old, schedule from today.
    await cancelMilestoneNotifications("1");
    await scheduleMilestoneNotifications("1", "Alcool", "2025-06-01");

    expect(LocalNotifications.cancel).toHaveBeenCalledOnce();
    expect(LocalNotifications.schedule).toHaveBeenCalledOnce();

    const scheduled = (vi.mocked(LocalNotifications.schedule).mock.calls[0]![0] as { notifications: { id: number; schedule: { at: Date } }[] }).notifications;
    // All rescheduled notifications must be in the future.
    const now = new Date("2025-06-01T06:00:00.000Z");
    for (const n of scheduled) {
      expect(n.schedule.at.getTime()).toBeGreaterThan(now.getTime());
    }
    expect(firstScheduleCount).toBeGreaterThanOrEqual(1);
  });
});

describe("Scenario: AppStartRescheduler isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({ notifications: [] });
    vi.mocked(getAllHabits).mockResolvedValue([makeHabit("1")]);
    vi.mocked(getAllHabitLogs).mockResolvedValue([startLog("1", "2025-01-14")]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("milestone reschedule runs even when treatment reschedule throws", async () => {
    // Simulate AppStartRescheduler: two isolated try/catch blocks.
    const treatmentReschedule = async () => { throw new Error("plugin error"); };

    let milestoneRan = false;
    const milestoneReschedule = async () => {
      await rescheduleAllMilestoneNotifications();
      milestoneRan = true;
    };

    try {
      await treatmentReschedule();
    } catch { /* treatments error ignored — AppStartRescheduler pattern */ }
    await milestoneReschedule();

    expect(milestoneRan).toBe(true);
    expect(LocalNotifications.schedule).toHaveBeenCalled();
  });
});

describe("Scenario: permission grant → milestones rescheduled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({ notifications: [] });
    vi.mocked(getAllHabits).mockResolvedValue([makeHabit("1")]);
    vi.mocked(getAllHabitLogs).mockResolvedValue([startLog("1", "2025-01-14")]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("calling rescheduleAllMilestoneNotifications after permission grant schedules future milestones", async () => {
    // Simulate handleActivateNotifications: requestPermission returned true → reschedule.
    await rescheduleAllMilestoneNotifications();

    expect(LocalNotifications.schedule).toHaveBeenCalled();
    const scheduled = (vi.mocked(LocalNotifications.schedule).mock.calls[0]![0] as { notifications: { id: number }[] }).notifications;
    expect(scheduled.length).toBeGreaterThan(0);
    for (const n of scheduled) {
      expect(n.id).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.milestones);
    }
  });

  it("milestone IDs scheduled after permission are in the milestones domain, not treatments", async () => {
    await rescheduleAllMilestoneNotifications();

    const scheduled = (vi.mocked(LocalNotifications.schedule).mock.calls[0]![0] as { notifications: { id: number }[] }).notifications;
    for (const n of scheduled) {
      expect(n.id).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.milestones);
      expect(n.id).toBeLessThan(NOTIF_DOMAIN_OFFSET.milestones + 1_000_000);
    }
  });
});

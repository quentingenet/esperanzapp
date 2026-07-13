import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { NOTIF_DOMAIN_OFFSET } from "@/hooks/useNotifications";
import { GRADES } from "./grades";
import {
  cancelMilestoneNotifications,
  getMilestoneNotificationId,
  scheduleMilestoneNotifications,
  rescheduleAllMilestoneNotifications,
} from "./milestoneNotifications";
import { getAllHabits, getAllHabitLogs } from "@/db";
import type { Habit, HabitLog } from "@/types";

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
}));

vi.mock("@/db", () => ({
  getAllHabits: vi.fn(),
  getAllHabitLogs: vi.fn(),
}));

const habit: Habit = {
  id: "1",
  label: "Alcool",
  icon: "🍺",
  color: "#3a8fd1",
  bgColor: "#e8f4ff",
  startDate: "2025-01-01",
  createdAt: "2025-01-01T10:00:00.000Z",
};

// Shorthand to extract the notifications array from the first LocalNotifications.schedule call
function scheduledNotifs<
  T = { id: number; title: string; body: string; schedule: { allowWhileIdle: boolean } },
>(): T[] {
  return (vi.mocked(LocalNotifications.schedule).mock.calls[0]![0] as { notifications: T[] })
    .notifications;
}

describe("scheduleMilestoneNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("does nothing on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await scheduleMilestoneNotifications("1", "2025-01-15");
    expect(LocalNotifications.checkPermissions).not.toHaveBeenCalled();
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("does nothing when notification permission is denied", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "denied" });
    await scheduleMilestoneNotifications("1", "2025-01-15");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("does not call schedule when all milestones are in the past", async () => {
    await scheduleMilestoneNotifications("1", "1990-01-01");
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("schedules all milestones when start date is today", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    expect(LocalNotifications.schedule).toHaveBeenCalledOnce();
    expect(scheduledNotifs()).toHaveLength(GRADES.length);
  });

  it("includes a same-day milestone whose hour already passed so Android fires it immediately", async () => {
    // now = noon, startDate = yesterday → day-1 milestone was at 10 AM this morning (past hour,
    // but still today). It is scheduled so Android fires it immediately via setExactAndAllowWhileIdle,
    // which is better than silently dropping it due to the cancel-then-reschedule startup pattern.
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
    await scheduleMilestoneNotifications("1", "2025-01-14");
    expect(LocalNotifications.schedule).toHaveBeenCalledOnce();
    expect(scheduledNotifs()).toHaveLength(GRADES.length);
  });

  it("skips a milestone that fell on a previous day (truly missed)", async () => {
    // now = 2025-01-16 noon, startDate = 2025-01-14 → day-1 milestone was 2025-01-15 (yesterday)
    vi.setSystemTime(new Date("2025-01-16T12:00:00.000Z"));
    await scheduleMilestoneNotifications("1", "2025-01-14");
    expect(LocalNotifications.schedule).toHaveBeenCalledOnce();
    expect(scheduledNotifs()).toHaveLength(GRADES.length - 1);
  });

  it("all notifications use allowWhileIdle: true", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const notifs = scheduledNotifs<{ schedule: { allowWhileIdle: boolean } }>();
    expect(notifs.every((n) => n.schedule.allowWhileIdle)).toBe(true);
  });

  it("all notification IDs are in the milestones domain", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const notifs = scheduledNotifs<{ id: number }>();
    expect(notifs.every((n) => n.id >= NOTIF_DOMAIN_OFFSET.milestones)).toBe(true);
  });

  it("notification title uses simple hyphen - as separator (not en-dash or em-dash)", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const notifs = scheduledNotifs<{ title: string }>();
    for (const n of notifs) {
      expect(n.title).toContain(" - ");
      expect(n.title).not.toContain("–");
      expect(n.title).not.toContain("—");
    }
  });

  it("notification title includes the grade emoji", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const notifs = scheduledNotifs<{ title: string }>();
    for (let i = 0; i < notifs.length; i++) {
      expect(notifs[i]!.title).toContain(GRADES[i]!.emoji);
    }
  });

  it("notification body contains the grade message (no habit label for lock screen privacy)", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const notifs = scheduledNotifs<{ body: string }>();
    const first = notifs[0];
    expect(first?.body).toContain(GRADES[0].messageKey);
    expect(first?.body).not.toContain(" - ");
  });

  it("produces unique IDs across two different habits", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const ids1 = new Set(scheduledNotifs<{ id: number }>().map((n) => n.id));
    vi.mocked(LocalNotifications.schedule).mockClear();

    await scheduleMilestoneNotifications("2", "2025-01-15");
    const ids2 = new Set(scheduledNotifs<{ id: number }>().map((n) => n.id));

    const collision = [...ids1].filter((id) => ids2.has(id));
    expect(collision).toHaveLength(0);
  });

  it("all notifications have group 'milestones' (Option A — Android grouping)", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const notifs = scheduledNotifs<{ group: string }>();
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs.every((n) => n.group === "milestones")).toBe(true);
  });

  it("each grade fires 10 minutes later than the previous one (Option B — time stagger)", async () => {
    await scheduleMilestoneNotifications("1", "2025-01-15");
    const notifs = scheduledNotifs<{ schedule: { at: Date } }>();
    expect(notifs).toHaveLength(GRADES.length);
    for (let i = 0; i < notifs.length; i++) {
      const at = notifs[i]!.schedule.at;
      const totalMinutes = at.getHours() * 60 + at.getMinutes();
      expect(totalMinutes).toBe(10 * 60 + i * 10); // grade 0 → 10:00, grade 1 → 10:10 …
    }
  });
});

describe("getMilestoneNotificationId", () => {
  it("habitId '0' uses the hash path (numericId > 0 guard) and stays in milestones domain", () => {
    // '0' fails the numericId > 0 check → falls through to stableHash31 path
    const id = getMilestoneNotificationId("0", 0);
    expect(id).toBeGreaterThanOrEqual(NOTIF_DOMAIN_OFFSET.milestones);
    // Must differ from numeric '1' (slot 1) and numeric '2' (slot 2)
    expect(id).not.toBe(getMilestoneNotificationId("1", 0));
    expect(id).not.toBe(getMilestoneNotificationId("2", 0));
  });

  it("numeric and hash-colliding habits share the same IDs (known collision risk, ~1/43477)", () => {
    // "habit-15214" hashes to stableHash31("habit-15214") % 43_477 === 1 (same slot as numeric "1")
    // This is a real but low-probability collision: two habits can clobber each other's notifications.
    for (let i = 0; i < GRADES.length; i++) {
      expect(getMilestoneNotificationId("1", i)).toBe(getMilestoneNotificationId("habit-15214", i));
    }
  });

  it("max possible ID stays below the positiveHabits domain (regression for off-by-one cap)", () => {
    // Highest slot (43_477) combined with the highest gradeIndex must not overflow into
    // NOTIF_DOMAIN_OFFSET.positiveHabits (3_000_000).
    const maxId = getMilestoneNotificationId("43477", GRADES.length - 1);
    expect(maxId).toBeLessThan(3_000_000);
  });
});

describe("cancelMilestoneNotifications", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("does nothing on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await cancelMilestoneNotifications("1");
    expect(LocalNotifications.cancel).not.toHaveBeenCalled();
  });

  it("cancels exactly GRADES.length notification IDs", async () => {
    await cancelMilestoneNotifications("1");
    expect(LocalNotifications.cancel).toHaveBeenCalledOnce();
    const { notifications } = vi.mocked(LocalNotifications.cancel).mock.calls[0]![0] as {
      notifications: unknown[];
    };
    expect(notifications).toHaveLength(GRADES.length);
  });

  it("all cancelled IDs are in the milestones domain", async () => {
    await cancelMilestoneNotifications("1");
    const arg = vi.mocked(LocalNotifications.cancel).mock.calls[0]![0];
    expect(arg.notifications.every((n) => n.id >= NOTIF_DOMAIN_OFFSET.milestones)).toBe(true);
  });

  it("produces different cancel IDs for different habits", async () => {
    await cancelMilestoneNotifications("1");
    const arg1 = vi.mocked(LocalNotifications.cancel).mock.calls[0]![0];
    const ids1 = arg1.notifications.map((n) => n.id);
    vi.mocked(LocalNotifications.cancel).mockClear();

    await cancelMilestoneNotifications("2");
    const arg2 = vi.mocked(LocalNotifications.cancel).mock.calls[0]![0];
    const ids2 = arg2.notifications.map((n) => n.id);

    expect(ids1).not.toEqual(ids2);
  });
});

describe("rescheduleAllMilestoneNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T06:00:00.000Z"));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    vi.mocked(LocalNotifications.cancel).mockResolvedValue({} as never);
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({} as never);
    vi.mocked(getAllHabits).mockResolvedValue([habit]);
    vi.mocked(getAllHabitLogs).mockResolvedValue([
      { id: "1", habitId: "1", eventType: "start", eventDate: "2025-01-14" },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it("does nothing on non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await rescheduleAllMilestoneNotifications();
    expect(getAllHabits).not.toHaveBeenCalled();
    expect(LocalNotifications.cancel).not.toHaveBeenCalled();
  });

  it("cancels then reschedules for each habit with a streak start", async () => {
    await rescheduleAllMilestoneNotifications();
    expect(LocalNotifications.cancel).toHaveBeenCalledOnce();
    expect(LocalNotifications.schedule).toHaveBeenCalledOnce();
  });

  it("skips habits with no start log", async () => {
    vi.mocked(getAllHabitLogs).mockResolvedValue([]);
    await rescheduleAllMilestoneNotifications();
    expect(LocalNotifications.cancel).not.toHaveBeenCalled();
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("purges orphan milestone notifications from a deleted habit", async () => {
    // habit "1" is alive; habit "2" was deleted but left a pending notification.
    const orphanId = getMilestoneNotificationId("2", 0);
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: [{ id: orphanId }],
    } as PendingResult);
    await rescheduleAllMilestoneNotifications();
    const calls = vi.mocked(LocalNotifications.cancel).mock.calls;
    const lastCancelNotifs = calls[calls.length - 1]![0].notifications;
    expect(lastCancelNotifs).toContainEqual({ id: orphanId });
  });

  it("does not cancel expected milestone IDs as orphans", async () => {
    // getPending returns a still-pending expected ID (e.g. from previous session).
    const expectedId = getMilestoneNotificationId("1", 0);
    type PendingResult = Awaited<ReturnType<typeof LocalNotifications.getPending>>;
    vi.mocked(LocalNotifications.getPending).mockResolvedValueOnce({
      notifications: [{ id: expectedId }],
    } as PendingResult);
    await rescheduleAllMilestoneNotifications();
    // Only one cancel call: the per-habit pre-cancel; expectedId is not an orphan.
    expect(LocalNotifications.cancel).toHaveBeenCalledOnce();
  });

  it("uses the most recent start log as streak start", async () => {
    // Old start + relapse + recent restart yesterday → all 20 milestones are in the future
    const logsWithRelapse: HabitLog[] = [
      { id: "1", habitId: "1", eventType: "start", eventDate: "2024-01-01" },
      { id: "2", habitId: "1", eventType: "relapse", eventDate: "2025-01-14" },
      { id: "3", habitId: "1", eventType: "start", eventDate: "2025-01-14" },
    ];
    vi.mocked(getAllHabitLogs).mockResolvedValue(logsWithRelapse);
    await rescheduleAllMilestoneNotifications();
    // The recent restart (yesterday) means all milestones fire in the future
    // If the old streak (2024-01-01) were used instead, most would be past
    const notifs = (
      vi.mocked(LocalNotifications.schedule).mock.calls[0]![0] as { notifications: unknown[] }
    ).notifications;
    expect(notifs).toHaveLength(GRADES.length);
  });
});

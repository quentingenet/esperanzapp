import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearLog, getLogEntries, logError } from "./logger";

describe("logError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearLog();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("strips user data from stored and console errors", () => {
    logError("HabitsStore.addHabit", new Error("Failed to insert habit: 'No-smoke'"));

    expect(JSON.stringify(getLogEntries())).not.toContain("No-smoke");
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("No-smoke");
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("Failed to insert habit");
  });
});

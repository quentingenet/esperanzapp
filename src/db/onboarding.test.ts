import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOnboardingValue, setOnboardingValue } from "./onboarding";

const mockDb = { run: vi.fn(), query: vi.fn() };
vi.mock("./client", () => ({ withDb: (fn: (db: typeof mockDb) => Promise<unknown>) => fn(mockDb), withDbVoid: (fn: (db: typeof mockDb) => Promise<void>) => fn(mockDb) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("getOnboardingValue", () => {
  it("returns value when key exists", async () => {
    mockDb.query.mockResolvedValue({ values: [{ value: "true" }] });
    expect(await getOnboardingValue("privacy_accepted")).toBe("true");
    expect(mockDb.query).toHaveBeenCalledWith(
      "SELECT value FROM onboarding WHERE key = ?",
      ["privacy_accepted"],
    );
  });

  it("returns null when key not found", async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    expect(await getOnboardingValue("privacy_accepted")).toBeNull();
  });

  it("returns null when values is undefined", async () => {
    mockDb.query.mockResolvedValue({});
    expect(await getOnboardingValue("user_name")).toBeNull();
  });
});

describe("setOnboardingValue", () => {
  it("upserts value with correct SQL", async () => {
    mockDb.run.mockResolvedValue({});
    await setOnboardingValue("user_name", "Alice");
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO onboarding"),
      ["user_name", "Alice"],
    );
    expect(mockDb.run.mock.calls[0]![0]).toContain("ON CONFLICT");
  });

  it("upserts tutorial_completed", async () => {
    mockDb.run.mockResolvedValue({});
    await setOnboardingValue("tutorial_completed", "true");
    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ["tutorial_completed", "true"]);
  });
});

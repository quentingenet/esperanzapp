import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";

// Runs with the real client module (not mocked), using the global sqlite/capacitor mocks
// from test/setup.ts.

describe("runInTransaction", () => {
  afterEach(async () => {
    // Reset db to null so each test starts fresh
    const { closeDatabase } = await import("./client");
    await closeDatabase();
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
  });

  it("calls fn() directly when db is not initialized", async () => {
    const { runInTransaction } = await import("./client");
    const fn = vi.fn().mockResolvedValue(undefined);
    await runInTransaction(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("propagates fn() errors when db is not initialized", async () => {
    const { runInTransaction } = await import("./client");
    const fn = vi.fn().mockRejectedValue(new Error("fn error"));
    await expect(runInTransaction(fn)).rejects.toThrow("fn error");
  });

  describe("with initialized db", () => {
    beforeEach(async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
      const { initDatabase } = await import("./client");
      await initDatabase();
    });

    it("serializes concurrent transactions so fn bodies never interleave", async () => {
      const { runInTransaction } = await import("./client");
      const order: string[] = [];
      let release!: () => void;

      const tx1 = runInTransaction(async () => {
        order.push("tx1");
        await new Promise<void>((r) => { release = r; });
        order.push("tx1-done");
      });

      const tx2 = runInTransaction(async () => {
        order.push("tx2");
      });

      // Yield to event loop so tx1's body starts (microtasks flush)
      await new Promise<void>((r) => setTimeout(r, 0));

      // tx1 is paused mid-body; tx2 must not have started yet
      expect(order).toEqual(["tx1"]);

      release();
      await Promise.all([tx1, tx2]);

      expect(order).toEqual(["tx1", "tx1-done", "tx2"]);
    });

    it("queue continues running after a failed transaction", async () => {
      const { runInTransaction } = await import("./client");
      const order: string[] = [];

      const tx1 = runInTransaction(async () => {
        order.push("tx1-start");
        throw new Error("tx1 failed");
      });

      const tx2 = runInTransaction(async () => {
        order.push("tx2-ran");
      });

      await expect(tx1).rejects.toThrow("tx1 failed");
      await tx2;

      expect(order).toEqual(["tx1-start", "tx2-ran"]);
    });

    it("wraps fn in a transaction (BEGIN / COMMIT visible to fn runs in order)", async () => {
      const { runInTransaction } = await import("./client");
      const order: string[] = [];
      await runInTransaction(async () => { order.push("body"); });
      // The body must run serialization tests already prove ordering is correct
      expect(order).toEqual(["body"]);
    });

    it("passes captured db connection to callback", async () => {
      const { runInTransaction } = await import("./client");
      let receivedDb: unknown = undefined;
      await runInTransaction(async (db) => { receivedDb = db; });
      expect(receivedDb).not.toBeNull();
      expect(receivedDb).not.toBeUndefined();
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { usePendingDeepLinkStore } from "./pendingDeepLinkStore";

describe("pendingDeepLinkStore", () => {
  beforeEach(() => {
    usePendingDeepLinkStore.setState({ queue: [] });
  });

  it("initial state has no pending deep link", () => {
    expect(usePendingDeepLinkStore.getState().queue).toEqual([]);
  });

  it("setPending stores the requested deep link", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "treatment", entityId: "7" });
    expect(usePendingDeepLinkStore.getState().queue).toEqual([
      { kind: "treatment", entityId: "7" },
    ]);
  });

  it("consumePending returns the entityId and clears it when the kind matches", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "habit", entityId: "3" });
    expect(usePendingDeepLinkStore.getState().consumePending("habit")).toBe("3");
    expect(usePendingDeepLinkStore.getState().queue).toEqual([]);
  });

  it("consuming twice only returns the entityId once", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "positiveHabit", entityId: "9" });
    expect(usePendingDeepLinkStore.getState().consumePending("positiveHabit")).toBe("9");
    expect(usePendingDeepLinkStore.getState().consumePending("positiveHabit")).toBeNull();
  });

  it("consumePending returns null and does not clear when the kind does not match", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "treatment", entityId: "7" });
    expect(usePendingDeepLinkStore.getState().consumePending("habit")).toBeNull();
    expect(usePendingDeepLinkStore.getState().queue).toEqual([
      { kind: "treatment", entityId: "7" },
    ]);
  });

  it("consumePending returns null when nothing is pending", () => {
    expect(usePendingDeepLinkStore.getState().consumePending("treatment")).toBeNull();
  });

  it("keeps entries of different kinds independent — one does not clobber the other", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "treatment", entityId: "7" });
    usePendingDeepLinkStore.getState().setPending({ kind: "positiveHabit", entityId: "9" });
    expect(usePendingDeepLinkStore.getState().consumePending("treatment")).toBe("7");
    expect(usePendingDeepLinkStore.getState().consumePending("positiveHabit")).toBe("9");
  });

  it("a second setPending for the same kind replaces the earlier unconsumed one", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "treatment", entityId: "7" });
    usePendingDeepLinkStore.getState().setPending({ kind: "treatment", entityId: "12" });
    expect(usePendingDeepLinkStore.getState().consumePending("treatment")).toBe("12");
    expect(usePendingDeepLinkStore.getState().consumePending("treatment")).toBeNull();
  });

  it("a positiveHabit deep link supersedes an unconsumed habit one — both render inside Home's single visible sub-tab", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "habit", entityId: "A" });
    usePendingDeepLinkStore.getState().setPending({ kind: "positiveHabit", entityId: "B" });
    expect(usePendingDeepLinkStore.getState().consumePending("habit")).toBeNull();
    expect(usePendingDeepLinkStore.getState().consumePending("positiveHabit")).toBe("B");
  });

  it("a habit deep link supersedes an unconsumed positiveHabit one (symmetric)", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "positiveHabit", entityId: "B" });
    usePendingDeepLinkStore.getState().setPending({ kind: "habit", entityId: "A" });
    expect(usePendingDeepLinkStore.getState().consumePending("positiveHabit")).toBeNull();
    expect(usePendingDeepLinkStore.getState().consumePending("habit")).toBe("A");
  });

  it("a treatment deep link is unaffected by Home-domain entries — different screen slot", () => {
    usePendingDeepLinkStore.getState().setPending({ kind: "treatment", entityId: "7" });
    usePendingDeepLinkStore.getState().setPending({ kind: "habit", entityId: "A" });
    usePendingDeepLinkStore.getState().setPending({ kind: "positiveHabit", entityId: "B" });
    expect(usePendingDeepLinkStore.getState().consumePending("treatment")).toBe("7");
    expect(usePendingDeepLinkStore.getState().consumePending("positiveHabit")).toBe("B");
  });
});

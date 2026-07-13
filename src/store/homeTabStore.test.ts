import { describe, it, expect, beforeEach } from "vitest";
import { useHomeTabStore } from "./homeTabStore";

describe("homeTabStore", () => {
  beforeEach(() => {
    useHomeTabStore.setState({ pendingTab: null });
  });

  it("initial state has no pending tab", () => {
    expect(useHomeTabStore.getState().pendingTab).toBeNull();
  });

  it("setPendingTab stores the requested tab", () => {
    useHomeTabStore.getState().setPendingTab("build");
    expect(useHomeTabStore.getState().pendingTab).toBe("build");
  });

  it("consumePendingTab returns the tab and clears it", () => {
    useHomeTabStore.getState().setPendingTab("build");
    expect(useHomeTabStore.getState().consumePendingTab()).toBe("build");
    expect(useHomeTabStore.getState().pendingTab).toBeNull();
  });

  it("consumePendingTab returns null when nothing is pending", () => {
    expect(useHomeTabStore.getState().consumePendingTab()).toBeNull();
  });

  it("consuming twice only returns the tab once", () => {
    useHomeTabStore.getState().setPendingTab("reduce");
    expect(useHomeTabStore.getState().consumePendingTab()).toBe("reduce");
    expect(useHomeTabStore.getState().consumePendingTab()).toBeNull();
  });
});

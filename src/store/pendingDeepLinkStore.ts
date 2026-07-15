import { create } from "zustand";
import type { NotificationDeepLink, NotificationDeepLinkKind } from "@/utils/notificationDeepLink";

interface PendingDeepLinkState {
  queue: NotificationDeepLink[];
  setPending: (link: NotificationDeepLink) => void;
  // Only consumes (and clears) a pending link if its kind matches — a screen must not
  // steal a deep link meant for another screen. Returns the target entity ID, or null.
  consumePending: (kind: NotificationDeepLinkKind) => string | null;
}

// "habit" and "positiveHabit" both render inside Home, which shows only one sub-tab at a time
// (see homeTabStore) — so at most one of them can ever be on screen, unlike "treatment" which
// lives on its own top-level tab and can coexist with whichever Home sub-tab is showing. A new
// Home-domain deep link must therefore supersede any earlier, still-unconsumed Home-domain
// entry of the *other* kind too: otherwise the superseded entry lingers in the queue and later
// resurfaces as a stale, out-of-context deep link the moment the user happens to visit that
// sub-tab on their own (see pendingDeepLinkStore.test.ts).
const HOME_KINDS: readonly NotificationDeepLinkKind[] = ["habit", "positiveHabit"];
function sharesScreenSlot(a: NotificationDeepLinkKind, b: NotificationDeepLinkKind): boolean {
  return a === b || (HOME_KINDS.includes(a) && HOME_KINDS.includes(b));
}

// Set by App.tsx when a notification tap carries a specific entity to focus (e.g. a treatment
// reminder should open Treatments with that treatment's card expanded, not just the tab).
// Keyed by screen slot rather than a single global slot: two notifications targeting different
// screens tapped in quick succession (before either target screen has consumed its entry) must
// not clobber each other. Within the same screen slot, a newer tap replaces an older unconsumed
// one — the most recent notification reflects what the user currently wants to see. Each screen
// (Treatments, ReduceHabitsTab, BuildHabitsTab) consumes only the kind it owns, reactively (see
// those components) rather than only once at mount, so an already-mounted screen still picks up
// a deep link that arrives while it's on screen.
export const usePendingDeepLinkStore = create<PendingDeepLinkState>((set, get) => ({
  queue: [],
  setPending: (link) => {
    set((s) => ({
      queue: [...s.queue.filter((l) => !sharesScreenSlot(l.kind, link.kind)), link],
    }));
  },
  consumePending: (kind) => {
    const link = get().queue.find((l) => l.kind === kind);
    if (!link) return null;
    set((s) => ({ queue: s.queue.filter((l) => l.kind !== kind) }));
    return link.entityId;
  },
}));

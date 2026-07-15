// Single source of truth for the payload a notification carries about the entity it concerns.
// Attached as `extra` when scheduling (see useNotifications.ts, milestoneNotifications.ts,
// buildMilestoneNotifications.ts) and read back from `action.notification.extra` on tap
// (see resolveNotificationTarget.ts). Kept separate from the ID-range domain logic in
// useNotifications.ts: the ID range tells you *which screen*, this tells you *which item*.
export type NotificationDeepLinkKind = "treatment" | "habit" | "positiveHabit";

export interface NotificationDeepLink {
  kind: NotificationDeepLinkKind;
  entityId: string;
}

const KNOWN_KINDS: readonly NotificationDeepLinkKind[] = ["treatment", "habit", "positiveHabit"];

export function toNotificationExtra(link: NotificationDeepLink): Record<string, unknown> {
  return { kind: link.kind, entityId: link.entityId };
}

// Defensive: `extra` round-trips through the OS notification store, so it may be missing
// (notification scheduled by an older app version) or malformed. Never throw — a bad payload
// should just mean "no deep link", falling back to the screen-level routing.
export function parseNotificationExtra(extra: unknown): NotificationDeepLink | null {
  if (typeof extra !== "object" || extra === null) return null;
  const { kind, entityId } = extra as Record<string, unknown>;
  if (typeof kind !== "string" || !KNOWN_KINDS.includes(kind as NotificationDeepLinkKind)) {
    return null;
  }
  if (typeof entityId !== "string" || entityId === "") return null;
  return { kind: kind as NotificationDeepLinkKind, entityId };
}

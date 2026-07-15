import { NOTIF_DOMAIN_OFFSET } from "@/hooks/useNotifications";
import type { HomeSubTab } from "@/store/homeTabStore";
import type { NavTab } from "@/types";
import { parseNotificationExtra } from "./notificationDeepLink";
import type { NotificationDeepLink, NotificationDeepLinkKind } from "./notificationDeepLink";

export interface NotificationTarget {
  activeTab: NavTab;
  subTab?: HomeSubTab;
  deepLink?: NotificationDeepLink;
}

type BaseTarget = Omit<NotificationTarget, "deepLink">;

// Pure and testable on purpose: this used to be an inline if/else in App.tsx's
// localNotificationActionPerformed listener, which meant the routing logic itself had no
// test coverage (only the ID-range helpers it read from did). The ID ranges alone (see
// NOTIF_DOMAIN_OFFSET) tell us which screen/tab to open; `extra` (see notificationDeepLink.ts)
// additionally tells us which entity to focus, when the notification carries it. Notifications
// scheduled before this field existed simply have no deep link — they still route to the
// right screen, just without focusing a specific item.
export function resolveNotificationTarget(notification: {
  id: number;
  extra?: unknown;
}): NotificationTarget | null {
  const deepLink = parseNotificationExtra(notification.extra);

  // Each ID range is only ever scheduled with one specific kind (see useNotifications.ts,
  // milestoneNotifications.ts, buildMilestoneNotifications.ts). If a payload's kind doesn't
  // match the range its ID falls in — a malformed/corrupted `extra`, or a future scheduling
  // bug that attaches the wrong kind — drop the deep link rather than propagate a target that
  // points at the wrong screen's entity. exactOptionalPropertyTypes forbids `deepLink:
  // undefined`, so the key is omitted entirely rather than set to undefined.
  function withDeepLink(target: BaseTarget, expectedKind: NotificationDeepLinkKind): NotificationTarget {
    if (deepLink && deepLink.kind === expectedKind) return { ...target, deepLink };
    return target;
  }

  if (notification.id >= NOTIF_DOMAIN_OFFSET.buildMilestones) {
    return withDeepLink({ activeTab: "home", subTab: "build" }, "positiveHabit");
  }
  if (notification.id >= NOTIF_DOMAIN_OFFSET.positiveHabits) {
    return withDeepLink({ activeTab: "home", subTab: "build" }, "positiveHabit");
  }
  if (notification.id >= NOTIF_DOMAIN_OFFSET.milestones) {
    return withDeepLink({ activeTab: "home", subTab: "reduce" }, "habit");
  }
  if (notification.id >= NOTIF_DOMAIN_OFFSET.treatments) {
    return withDeepLink({ activeTab: "treatments" }, "treatment");
  }
  return null;
}

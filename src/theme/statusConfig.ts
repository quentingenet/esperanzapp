import { COLORS } from "./tokens";
import type { TreatmentStatus } from "@/types";

// Shared by OccurrenceCalendar and BuildHistoryTab so the taken/missed/pending
// visual language (color, icon) stays consistent everywhere it appears. The text label
// itself is domain-aware (treatments.* vs positiveHabits.*) and resolved by the caller.
export const STATUS_CONFIG: Record<TreatmentStatus, { color: string; icon: string; bg: string }> = {
  taken: { color: "#5aaa7e", icon: "✅", bg: "#e8f5ee" },
  missed: { color: COLORS.eventRelapse, icon: "❌", bg: "#fdf0f0" },
  pending: { color: "#89afc4", icon: "○", bg: "#edf2f7" },
};

export const STATUS_ORDER: TreatmentStatus[] = ["taken", "missed", "pending"];

import type React from "react";

export type EventType = "start" | "relapse";
export type Frequency = "daily" | "weekly" | "monthly";
export type TreatmentStatus = "taken" | "missed" | "pending";
export type OnboardingKey = "privacy_accepted" | "tutorial_completed" | "user_name";

export interface Habit {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  startDate: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  eventType: EventType;
  eventDate: string;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalRelapses: number;
  averageStreak: number;
  startDate: string;
  lastRelapseDate: string | null;
  currentStreakStart: string | null;
}

export interface Treatment {
  id: string;
  label: string;
  frequency: Frequency;
  reminderTime: string;
  reminderEnabled: boolean;
  reminderDay: number | null; // weekly: 0 to 6 (JS getDay), monthly: 0 last day or 1 to 28, null for daily
  createdAt: string;
}

export interface TreatmentLog {
  id: string;
  treatmentId: string;
  scheduledAt: string;
  status: TreatmentStatus;
}

export interface PositiveHabit {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  frequency: Frequency;
  reminderTime: string;
  reminderEnabled: boolean;
  reminderDay: number | null; // weekly: 0 to 6 (JS getDay), monthly: 0 last day or 1 to 28, null for daily
  createdAt: string;
}

export interface PositiveHabitLog {
  id: string;
  positiveHabitId: string;
  scheduledAt: string;
  status: TreatmentStatus;
}

export interface Grade {
  // Number of days for a streak grade (GRADES), or a cumulative count for a
  // positive-habit grade (POSITIVE_GRADES) — the meaning is defined by the array used.
  threshold: number;
  labelKey: string;
  emoji: string;
  messageKey: string;
  color: string;
  bgColor: string;
}

export type NavTab = "home" | "milestones" | "treatments" | "history" | "settings";

export interface BottomNavProps {
  activeTab: NavTab;
  onChange: (tab: NavTab) => void;
}

export interface GradeBadgeProps {
  grade: Grade;
  size?: "sm" | "md" | "lg";
}

export interface EmptyStateProps {
  emoji?: string;
  message: string;
}

export interface PageHeaderProps {
  title: string;
  onBack?: () => void;
}

export interface PrivacyModalProps {
  open: boolean;
  onAccept: () => void;
  readOnly?: boolean;
}

export interface OnboardingSliderProps {
  onComplete: () => void;
  onSkip: () => void;
}

export interface UserNameInputProps {
  onSave: (name: string) => void;
  onSkip: () => void;
}

export type HabitTypeId =
  | "alcohol"
  | "tobacco"
  | "sugar"
  | "cannabis"
  | "social_media"
  | "gaming"
  | "fast_food"
  | "adult_content"
  | "shopping"
  | "caffeine"
  | "screens"
  | "gambling"
  | "custom";

export interface HabitTypeConfig {
  id: HabitTypeId;
  group: "substances" | "behaviours" | "custom";
  color: string;
  bgColor: string;
  svgPath: string;
}

export type DragHandleProps = React.HTMLAttributes<HTMLElement>;

export interface HabitCardProps {
  habit: Habit;
  stats: HabitStats;
  grade: Grade;
  nextGrade: { grade: Grade; daysLeft: number } | null;
  onClick: () => void;
  onDelete: () => void;
  handleProps?: DragHandleProps | undefined;
}

export interface HabitDropdownProps {
  selectedId: HabitTypeId | null;
  customLabel: string;
  onSelect: (id: HabitTypeId) => void;
  onCustomChange: (label: string) => void;
}

export interface HabitFormProps {
  onSubmit: (data: Omit<Habit, "id" | "createdAt">) => void;
  existingHabits: Habit[];
  isEmpty?: boolean;
}

export interface RelapseDialogProps {
  open: boolean;
  habit: Habit;
  stats: HabitStats;
  userName: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

export interface TreatmentLogButtonProps {
  // Structural: also satisfied by PositiveHabitLog, so this button is reused as-is
  // for positive habits instead of duplicated.
  todayLog: { status: TreatmentStatus } | null;
  onLog: (status: TreatmentStatus) => void;
  // i18n key prefix for the "taken"/"missed" labels — "treatments.taken" reads as
  // "Pris" (medication-specific); positive habits use "positiveHabits.taken" ("Fait").
  namespace?: "treatments" | "positiveHabits";
}

export interface TreatmentCardProps {
  treatment: Treatment;
  todayLog: TreatmentLog | null;
  onLog: (status: TreatmentStatus) => void;
  onDelete: () => void;
  onEdit: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  handleProps?: DragHandleProps | undefined;
}

export interface TreatmentFormProps {
  onSubmit: (data: Omit<Treatment, "id" | "createdAt">) => void;
  isEmpty?: boolean;
}

export interface OccurrenceCalendarProps {
  entityId: string;
  frequency: Frequency;
  reminderDay: number | null;
  createdAt: string;
  getStatusMap: (entityId: string) => Promise<Record<string, TreatmentStatus>>;
  onLogDate?: (date: string, status: TreatmentStatus) => Promise<void>;
  // i18n key prefix for status labels — see TreatmentLogButtonProps.namespace.
  namespace?: "treatments" | "positiveHabits";
}

export type PositiveHabitTypeId =
  "sport" | "reading" | "meditation" | "tidying" | "healthyEating" | "custom";

export interface PositiveHabitTypeConfig {
  id: PositiveHabitTypeId;
  group: "activities" | "custom";
  color: string;
  bgColor: string;
  svgPath: string;
}

export interface PositiveHabitDropdownProps {
  selectedId: PositiveHabitTypeId | null;
  customLabel: string;
  onSelect: (id: PositiveHabitTypeId) => void;
  onCustomChange: (label: string) => void;
}

export interface PositiveHabitCardProps {
  positiveHabit: PositiveHabit;
  todayLog: PositiveHabitLog | null;
  onLog: (status: TreatmentStatus) => void;
  onDelete: () => void;
  onEdit: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  handleProps?: DragHandleProps | undefined;
}

export interface PositiveHabitFormProps {
  onSubmit: (data: Omit<PositiveHabit, "id" | "createdAt">) => void;
  existingPositiveHabits: PositiveHabit[];
  isEmpty?: boolean;
}

import type React from "react";

export type EventType = "start" | "relapse";
export type Frequency = "daily" | "weekly" | "monthly";
export type TreatmentStatus = "taken" | "missed" | "pending";
export type DayStatus = "start" | "active" | "relapse" | "taken" | "missed" | "pending" | "none";
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
}

export interface Treatment {
  id: string;
  label: string;
  frequency: Frequency;
  reminderTime: string;
  reminderEnabled: boolean;
  reminderDay: number | null; // weekly: 0-6 (JS getDay), monthly: 1-28, null for daily
  createdAt: string;
}

export interface TreatmentLog {
  id: string;
  treatmentId: string;
  scheduledAt: string;
  status: TreatmentStatus;
}

export interface Grade {
  days: number;
  labelKey: string;
  emoji: string;
  messageKey: string;
  color: string;
  bgColor: string;
}

export interface HabitIcon {
  id: string;
  labelKey: string;
  descKey: string;
  svgPath: string;
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
  ctaLabel?: string;
  onCta?: () => void;
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
  | "alcohol" | "tobacco" | "sugar" | "cannabis"
  | "social_media" | "gaming" | "fast_food" | "adult_content"
  | "shopping" | "caffeine" | "screens" | "gambling" | "custom";

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
  treatmentId: string;
  todayLog: TreatmentLog | null;
  onLog: (status: TreatmentStatus) => void;
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
}

export interface TreatmentCalendarProps {
  treatmentId: string;
  frequency: Frequency;
  reminderDay: number | null;
  createdAt: string;
  onLogDate?: (date: string, status: TreatmentStatus) => Promise<void>;
}

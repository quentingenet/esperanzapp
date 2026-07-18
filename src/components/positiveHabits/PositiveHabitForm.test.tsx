import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { enUS } from "date-fns/locale";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PositiveHabitForm } from "./PositiveHabitForm";
import { getPositiveHabitTypeConfig } from "@/utils/positiveHabitTypes";
import type { PositiveHabit } from "@/types";

const mocks = vi.hoisted(() => ({
  requestPermission: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@/hooks", () => ({
  useNotifications: () => ({ requestPermission: mocks.requestPermission }),
  useDateLocale: () => enUS,
}));

vi.mock("@/store/toastStore", () => ({
  toast: { info: mocks.toastInfo },
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "en" },
    }),
  };
});

const sportConfig = getPositiveHabitTypeConfig("sport")!;

const sportHabit: PositiveHabit = {
  id: "1",
  label: "Course à pied",
  icon: sportConfig.svgPath,
  color: sportConfig.color,
  bgColor: sportConfig.bgColor,
  frequency: "daily",
  reminderTime: "08:00",
  reminderEnabled: true,
  reminderDay: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "positiveHabits.add" }));
}

describe("PositiveHabitForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    mocks.requestPermission.mockResolvedValue(true);
  });

  it("FAB click opens the form drawer", async () => {
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={vi.fn()} existingPositiveHabits={[]} />);
    await openForm(user);
    expect(screen.getByRole("button", { name: "common.save" })).toBeInTheDocument();
  });

  it("submit button is disabled before selecting a type", async () => {
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={vi.fn()} existingPositiveHabits={[]} />);
    await openForm(user);
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("submit button is enabled after selecting a preset type", async () => {
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={vi.fn()} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    expect(screen.getByRole("button", { name: "common.save" })).not.toBeDisabled();
  });

  it("calls onSubmit with correct payload for a preset type (daily by default)", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={onSubmit} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["label"]).toBe("positiveHabitTypes.sport.label");
    expect(typeof payload["icon"]).toBe("string");
    expect(payload["frequency"]).toBe("daily");
    expect(payload["reminderDay"]).toBeNull();
    expect(payload["reminderEnabled"]).toBe(true);
    expect(String(payload["reminderTime"])).toMatch(/^\d{2}:\d{2}$/);
    expect(payload["isCustom"]).toBe(false);
  });

  it("calls onSubmit with isCustom: true for a custom type", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={onSubmit} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.custom.label" }));
    await user.type(
      screen.getByRole("textbox", { name: "positiveHabitTypes.groups.custom" }),
      "Yoga du soir",
    );
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0]![0] as Record<string, unknown>)["isCustom"]).toBe(true);
  });

  it("shows duplicate warning and disables submit when the icon already exists", async () => {
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={vi.fn()} existingPositiveHabits={[sportHabit]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    expect(screen.getByText("positiveHabits.duplicateWarning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("submit is disabled for custom type when label is empty", async () => {
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={vi.fn()} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.custom.label" }));
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("custom label is trimmed before being passed to onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={onSubmit} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.custom.label" }));
    await user.type(
      screen.getByRole("textbox", { name: "positiveHabitTypes.groups.custom" }),
      "  Yoga du soir  ",
    );
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0]![0] as Record<string, unknown>)["label"]).toBe("Yoga du soir");
  });

  it("switching to weekly auto-sets reminderDay to 1 in payload", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={onSubmit} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "treatments.form.frequencies.weekly" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["frequency"]).toBe("weekly");
    expect(payload["reminderDay"]).toBe(1);
  });

  it("disabling reminder: reminderEnabled=false, reminderDay=null", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={onSubmit} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["reminderEnabled"]).toBe(false);
    expect(payload["reminderDay"]).toBeNull();
  });

  it("form resets and drawer closes after successful submit", async () => {
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={vi.fn()} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "common.save" })).not.toBeInTheDocument();
    });
  });

  it("native + permission denied → reminderEnabled=false + toast", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "denied" });
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={onSubmit} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0]![0] as Record<string, unknown>)["reminderEnabled"]).toBe(false);
    expect(mocks.toastInfo).toHaveBeenCalledWith("treatments.form.permissionDenied");
  });

  it("on web: requestPermission and checkPermissions are never called", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PositiveHabitForm onSubmit={onSubmit} existingPositiveHabits={[]} />);
    await openForm(user);
    await user.click(screen.getByRole("button", { name: "positiveHabitTypes.sport.label" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(vi.mocked(LocalNotifications.checkPermissions)).not.toHaveBeenCalled();
    expect(mocks.requestPermission).not.toHaveBeenCalled();
  });
});

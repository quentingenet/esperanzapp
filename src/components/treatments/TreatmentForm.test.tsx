import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { enUS } from "date-fns/locale";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { TreatmentForm } from "./TreatmentForm";

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

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "treatments.add" }));
}

describe("TreatmentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
    mocks.requestPermission.mockResolvedValue(true);
  });

  it("FAB click opens the form drawer", async () => {
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={vi.fn()} />);
    await openForm(user);
    expect(screen.getByRole("button", { name: "common.save" })).toBeInTheDocument();
  });

  it("submit button is disabled when label is empty", async () => {
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={vi.fn()} />);
    await openForm(user);
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("submit button is disabled when label is only whitespace", async () => {
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={vi.fn()} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "   ");
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("submit button is enabled when label is filled", async () => {
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={vi.fn()} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Metformin");
    expect(screen.getByRole("button", { name: "common.save" })).not.toBeDisabled();
  });

  it("calls onSubmit with correct payload for daily frequency", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Aspirin");
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["label"]).toBe("Aspirin");
    expect(payload["frequency"]).toBe("daily");
    expect(payload["reminderDay"]).toBeNull();
    expect(payload["reminderEnabled"]).toBe(true);
    expect(String(payload["reminderTime"])).toMatch(/^\d{2}:\d{2}$/);
  });

  it("switching to weekly auto-sets reminderDay to 1 in payload", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    // MUI Select renders role="combobox" (no accessible name without FormControl label)
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "treatments.form.frequencies.weekly" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["frequency"]).toBe("weekly");
    expect(payload["reminderDay"]).toBe(1);
  });

  it("switching to monthly auto-sets reminderDay to 1 in payload", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "treatments.form.frequencies.monthly" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["frequency"]).toBe("monthly");
    expect(payload["reminderDay"]).toBe(1);
  });

  it("switching weekly → daily resets reminderDay to null in payload", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    // Switch to weekly (only 1 combobox at this point — frequency select)
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "treatments.form.frequencies.weekly" }));
    // Now 2 comboboxes: [0]=frequency, [1]=reminderDay. Re-open the frequency one.
    await user.click(screen.getAllByRole("combobox")[0]!);
    await user.click(screen.getByRole("option", { name: "treatments.form.frequencies.daily" }));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["frequency"]).toBe("daily");
    expect(payload["reminderDay"]).toBeNull();
  });

  it("disabling reminder: reminderEnabled=false, reminderDay=null, reminderTime='08:00'", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload["reminderEnabled"]).toBe(false);
    expect(payload["reminderDay"]).toBeNull();
    expect(payload["reminderTime"]).toBe("08:00");
  });

  it("form resets and drawer closes after successful submit", async () => {
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={vi.fn()} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
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
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0]![0] as Record<string, unknown>)["reminderEnabled"]).toBe(false);
    expect(mocks.toastInfo).toHaveBeenCalledWith("treatments.form.permissionDenied");
  });

  it("native + permission prompt + requestPermission denied → reminderEnabled=false + toast", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "prompt" });
    mocks.requestPermission.mockResolvedValue(false);
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
    expect((onSubmit.mock.calls[0]![0] as Record<string, unknown>)["reminderEnabled"]).toBe(false);
    expect(mocks.toastInfo).toHaveBeenCalledWith("treatments.form.permissionDenied");
  });

  it("native + permission prompt + requestPermission granted → reminderEnabled stays true", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "prompt" });
    mocks.requestPermission.mockResolvedValue(true);
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0]![0] as Record<string, unknown>)["reminderEnabled"]).toBe(true);
    expect(mocks.toastInfo).not.toHaveBeenCalled();
  });

  it("on web: requestPermission and checkPermissions are never called", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TreatmentForm onSubmit={onSubmit} />);
    await openForm(user);
    await user.type(screen.getByRole("textbox", { name: "treatments.form.name" }), "Med");
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(vi.mocked(LocalNotifications.checkPermissions)).not.toHaveBeenCalled();
    expect(mocks.requestPermission).not.toHaveBeenCalled();
  });
});

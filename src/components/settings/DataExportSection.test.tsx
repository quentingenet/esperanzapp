import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataExportSection } from "./DataExportSection";

const mocks = vi.hoisted(() => ({
  exportJSON: vi.fn(),
  exportCSV: vi.fn(),
  saveJSON: vi.fn(),
  saveCSV: vi.fn(),
  importJSON: vi.fn(),
  importCSV: vi.fn(),
  detectEncrypted: vi.fn(),
  loadHabits: vi.fn(),
  loadTreatments: vi.fn(),
  loadPositiveHabits: vi.fn(),
  rescheduleAll: vi.fn(),
  requestPermission: vi.fn(),
  getTreatmentsState: vi.fn(),
  getPositiveHabitsState: vi.fn(),
  rescheduleAllMilestoneNotifications: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/services", () => ({
  exportToJSON: mocks.exportJSON,
  exportToCSV: mocks.exportCSV,
  saveJSONToFolder: mocks.saveJSON,
  saveCSVToFolder: mocks.saveCSV,
  importFromJSON: mocks.importJSON,
  importFromCSV: mocks.importCSV,
}));

vi.mock("@/utils/exportSerialization", () => ({
  peekIsEncrypted: mocks.detectEncrypted,
}));

vi.mock("@/hooks", () => ({
  useHabits: () => ({ loadHabits: mocks.loadHabits }),
  useTreatments: () => ({ loadTreatments: mocks.loadTreatments }),
  usePositiveHabits: () => ({ loadPositiveHabits: mocks.loadPositiveHabits }),
  useNotifications: () => ({
    rescheduleAll: mocks.rescheduleAll,
    requestPermission: mocks.requestPermission,
  }),
}));

vi.mock("@/store/treatmentsStore", () => ({
  useTreatmentsStore: Object.assign(
    (selector: (s: { treatments: unknown[] }) => unknown) => selector({ treatments: [] }),
    { getState: mocks.getTreatmentsState },
  ),
}));

vi.mock("@/store/positiveHabitsStore", () => ({
  usePositiveHabitsStore: Object.assign(
    (selector: (s: { positiveHabits: unknown[] }) => unknown) =>
      selector({ positiveHabits: [] }),
    { getState: mocks.getPositiveHabitsState },
  ),
}));

vi.mock("@/store/toastStore", () => ({ toast: mocks.toast }));

vi.mock("@/utils/milestoneNotifications", () => ({
  rescheduleAllMilestoneNotifications: mocks.rescheduleAllMilestoneNotifications,
}));

vi.mock("@/utils/importErrorMessage", () => ({
  getImportErrorTranslationKey: () => "export.error",
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "en", changeLanguage: vi.fn() },
    }),
  };
});

// Intercept the next file input created by triggerImportFile and simulate selection.
function simulateFileSelection(file: File) {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const origCreate = document.createElement.bind(document);
  let intercepted = false;
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    const el = origCreate(tagName);
    if (tagName === "input" && !intercepted) {
      intercepted = true;
      vi.spyOn(el as HTMLInputElement, "click").mockImplementationOnce(() => {
        Object.defineProperty(el, "files", {
          value: [file],
          writable: true,
          configurable: true,
        });
        el.dispatchEvent(new Event("change"));
      });
    }
    return el;
  });
}

// Go through the common import steps up to (and including) the destructive warning dialog.
async function openImportWarnDialog(user: ReturnType<typeof userEvent.setup>, file: File) {
  simulateFileSelection(file);
  await user.click(screen.getByRole("button", { name: "export.importBtn" }));
  await user.click(await screen.findByRole("button", { name: "export.chooseFileBtn" }));
  await screen.findByText("export.importWarningTitle");
}

const MINIMAL_JSON_FILE = new File(["{}"], "export.json", { type: "application/json" });

describe("DataExportSection — import file size validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detectEncrypted.mockResolvedValue(false);
    mocks.getTreatmentsState.mockReturnValue({ treatments: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a file over 10 MB and shows an error toast", async () => {
    const user = userEvent.setup();
    const bigFile = new File(["{}"], "export.json", { type: "application/json" });
    Object.defineProperty(bigFile, "size", { value: 20 * 1024 * 1024, configurable: true });
    render(<DataExportSection />);
    await user.click(screen.getByRole("button", { name: "export.importBtn" }));
    await screen.findByRole("button", { name: "export.chooseFileBtn" });
    simulateFileSelection(bigFile);
    await user.click(screen.getByRole("button", { name: "export.chooseFileBtn" }));
    expect(mocks.toast.error).toHaveBeenCalledWith("export.importFileTooLarge");
    expect(screen.queryByText("export.importWarningTitle")).not.toBeInTheDocument();
  });

  it("proceeds normally for a file within 10 MB", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(screen.getByRole("button", { name: "export.importBtn" }));
    await screen.findByRole("button", { name: "export.chooseFileBtn" });
    simulateFileSelection(MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.chooseFileBtn" }));
    expect(mocks.toast.error).not.toHaveBeenCalledWith("export.importFileTooLarge");
    await screen.findByText("export.importWarningTitle");
  });
});

describe("DataExportSection — plain JSON import flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detectEncrypted.mockResolvedValue(false);
    mocks.importJSON.mockResolvedValue(undefined);
    mocks.importCSV.mockResolvedValue(undefined);
    mocks.loadHabits.mockResolvedValue(undefined);
    mocks.loadTreatments.mockResolvedValue(undefined);
    mocks.loadPositiveHabits.mockResolvedValue(undefined);
    mocks.requestPermission.mockResolvedValue(true);
    mocks.rescheduleAll.mockResolvedValue(undefined);
    mocks.rescheduleAllMilestoneNotifications.mockResolvedValue(undefined);
    mocks.getTreatmentsState.mockReturnValue({ treatments: [] });
    mocks.getPositiveHabitsState.mockReturnValue({ positiveHabits: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warning dialog opens after file selection, confirm calls importJSON", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.importJSON).toHaveBeenCalledTimes(1));
  });

  it("toast.success is shown after successful import", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("export.importSuccess"));
  });

  it("loadHabits, loadTreatments and loadPositiveHabits are all called after import", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => {
      expect(mocks.loadHabits).toHaveBeenCalledTimes(1);
      expect(mocks.loadTreatments).toHaveBeenCalledTimes(1);
      expect(mocks.loadPositiveHabits).toHaveBeenCalledTimes(1);
    });
  });

  it("rescheduleAll is called when imported treatments have reminders", async () => {
    mocks.getTreatmentsState.mockReturnValue({
      treatments: [
        {
          id: "1",
          label: "Med",
          frequency: "daily",
          reminderTime: "08:00",
          reminderEnabled: true,
          reminderDay: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.rescheduleAll).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "1" })]),
    ));
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("rescheduleAll is called for positiveHabits when imported positive habits have reminders", async () => {
    mocks.getPositiveHabitsState.mockReturnValue({
      positiveHabits: [
        {
          id: "1",
          label: "Course à pied",
          icon: "M...",
          color: "#2e7d32",
          bgColor: "#e8f5e9",
          frequency: "daily",
          reminderTime: "07:00",
          reminderEnabled: true,
          reminderDay: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() =>
      expect(mocks.rescheduleAll).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "1", label: "Course à pied" })]),
        "positiveHabits",
      ),
    );
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("rescheduleAll is NOT called when neither imported treatments nor positive habits have reminders", async () => {
    mocks.getTreatmentsState.mockReturnValue({ treatments: [] });
    mocks.getPositiveHabitsState.mockReturnValue({ positiveHabits: [] });
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.importJSON).toHaveBeenCalledTimes(1));
    // Allow async work to settle
    await waitFor(() => expect(mocks.loadPositiveHabits).toHaveBeenCalledTimes(1));
    expect(mocks.rescheduleAll).not.toHaveBeenCalled();
  });

  it("rescheduleAllMilestoneNotifications is called after successful import regardless of treatments", async () => {
    mocks.getTreatmentsState.mockReturnValue({ treatments: [] });
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.rescheduleAllMilestoneNotifications).toHaveBeenCalledTimes(1));
    // And not called when import fails
    expect(mocks.importJSON).toHaveBeenCalledTimes(1);
  });

  it("rescheduleAllMilestoneNotifications is NOT called when import fails", async () => {
    mocks.importJSON.mockRejectedValue(new Error("bad file"));
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(1));
    expect(mocks.rescheduleAllMilestoneNotifications).not.toHaveBeenCalled();
  });

  it("import error shows toast.error and no success toast", async () => {
    mocks.importJSON.mockRejectedValue(new Error("bad"));
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(1));
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });

  it("cancelling the warning dialog does not call importJSON", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(mocks.importJSON).not.toHaveBeenCalled();
  });
});

describe("DataExportSection — CSV import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detectEncrypted.mockResolvedValue(false);
    mocks.importCSV.mockResolvedValue(undefined);
    mocks.loadHabits.mockResolvedValue(undefined);
    mocks.loadTreatments.mockResolvedValue(undefined);
    mocks.loadPositiveHabits.mockResolvedValue(undefined);
    mocks.requestPermission.mockResolvedValue(true);
    mocks.rescheduleAll.mockResolvedValue(undefined);
    mocks.rescheduleAllMilestoneNotifications.mockResolvedValue(undefined);
    mocks.getTreatmentsState.mockReturnValue({ treatments: [] });
    mocks.getPositiveHabitsState.mockReturnValue({ positiveHabits: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("CSV file triggers importCSV, not importJSON", async () => {
    const csvFile = new File(["HABITS\n"], "export.csv", { type: "text/csv" });
    const user = userEvent.setup();
    render(<DataExportSection />);
    await openImportWarnDialog(user, csvFile);
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.importCSV).toHaveBeenCalledTimes(1));
    expect(mocks.importJSON).not.toHaveBeenCalled();
  });
});

describe("DataExportSection — encrypted import flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detectEncrypted.mockResolvedValue(true);
    mocks.importJSON.mockResolvedValue(undefined);
    mocks.loadHabits.mockResolvedValue(undefined);
    mocks.loadTreatments.mockResolvedValue(undefined);
    mocks.loadPositiveHabits.mockResolvedValue(undefined);
    mocks.requestPermission.mockResolvedValue(true);
    mocks.rescheduleAll.mockResolvedValue(undefined);
    mocks.rescheduleAllMilestoneNotifications.mockResolvedValue(undefined);
    mocks.getTreatmentsState.mockReturnValue({ treatments: [] });
    mocks.getPositiveHabitsState.mockReturnValue({ positiveHabits: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encrypted file opens password dialog instead of warning dialog", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    simulateFileSelection(MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importBtn" }));
    await user.click(await screen.findByRole("button", { name: "export.chooseFileBtn" }));
    await screen.findByText("export.encryptedImportTitle");
    expect(screen.queryByText("export.importWarningTitle")).not.toBeInTheDocument();
  });

  it("confirming password then warning calls importJSON with the password", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    simulateFileSelection(MINIMAL_JSON_FILE);
    await user.click(screen.getByRole("button", { name: "export.importBtn" }));
    await user.click(await screen.findByRole("button", { name: "export.chooseFileBtn" }));
    await screen.findByText("export.encryptedImportTitle");
    // Password TextField has type="password"; find by associated label
    const pwdInput = screen.getByLabelText("export.encryptPassword");
    await user.type(pwdInput, "mypassword");
    await user.click(screen.getByRole("button", { name: "common.confirm" }));
    // Warning dialog
    await screen.findByText("export.importWarningTitle");
    await user.click(screen.getByRole("button", { name: "export.importConfirm" }));
    await waitFor(() => expect(mocks.importJSON).toHaveBeenCalledTimes(1));
    const [, password] = mocks.importJSON.mock.calls[0] as [File, string | undefined];
    expect(password).toBe("mypassword");
  });
});

describe("DataExportSection — export flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exportJSON.mockResolvedValue("ok");
    mocks.exportCSV.mockResolvedValue("ok");
    mocks.saveJSON.mockResolvedValue("ok");
    mocks.saveCSV.mockResolvedValue("ok");
    mocks.getTreatmentsState.mockReturnValue({ treatments: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Share button calls exportJSON", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(screen.getByRole("button", { name: "export.exportBtn" }));
    await user.click(await screen.findByRole("button", { name: "export.shareBtn" }));
    await waitFor(() => expect(mocks.exportJSON).toHaveBeenCalledTimes(1));
  });

  it("switching to CSV format and clicking Share calls exportCSV", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(screen.getByRole("button", { name: "export.exportBtn" }));
    await screen.findByRole("button", { name: "export.shareBtn" });
    await user.click(screen.getByRole("button", { name: "CSV" }));
    await user.click(screen.getByRole("button", { name: "export.shareBtn" }));
    await waitFor(() => expect(mocks.exportCSV).toHaveBeenCalledTimes(1));
    expect(mocks.exportJSON).not.toHaveBeenCalled();
  });

  it("enabling encryption disables Share until passwords match, then exports with password", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(screen.getByRole("button", { name: "export.exportBtn" }));
    await screen.findByRole("button", { name: "export.shareBtn" });
    await user.click(screen.getByRole("button", { name: "common.yes" }));
    expect(screen.getByLabelText("export.encryptPassword")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "export.shareBtn" })).toBeDisabled();
    await user.type(screen.getByLabelText("export.encryptPassword"), "password123");
    await user.type(screen.getByLabelText("export.encryptPasswordConfirm"), "password123");
    await user.click(screen.getByRole("button", { name: "export.shareBtn" }));
    await waitFor(() => expect(mocks.exportJSON).toHaveBeenCalledWith("password123"));
  });

  it("Save button then confirm calls saveJSON and shows success toast", async () => {
    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(screen.getByRole("button", { name: "export.exportBtn" }));
    await user.click(await screen.findByRole("button", { name: "export.saveBtn" }));
    await user.click(await screen.findByRole("button", { name: "common.confirm" }));
    await waitFor(() => expect(mocks.saveJSON).toHaveBeenCalledTimes(1));
    expect(mocks.toast.success).toHaveBeenCalledWith("export.saveSuccess");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataExportSection } from "./DataExportSection";

const mocks = vi.hoisted(() => ({
  detectEncrypted: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/hooks", () => ({
  useExport: () => ({
    exportJSON: vi.fn().mockResolvedValue("ok"),
    exportCSV: vi.fn().mockResolvedValue("ok"),
    saveJSON: vi.fn().mockResolvedValue("ok"),
    saveCSV: vi.fn().mockResolvedValue("ok"),
    importJSON: vi.fn().mockResolvedValue(undefined),
    importCSV: vi.fn().mockResolvedValue(undefined),
    detectEncrypted: mocks.detectEncrypted,
  }),
  useHabits: () => ({ loadHabits: vi.fn() }),
  useTreatments: () => ({ loadTreatments: vi.fn() }),
  useNotifications: () => ({
    rescheduleAll: vi.fn(),
    requestPermission: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("@/store/treatmentsStore", () => ({
  useTreatmentsStore: (selector: (s: { treatments: never[] }) => unknown) =>
    selector({ treatments: [] }),
}));

vi.mock("@/store/toastStore", () => ({ toast: mocks.toast }));

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

describe("DataExportSection — import file size validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detectEncrypted.mockResolvedValue(false);
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

    const smallFile = new File(["{}"], "export.json", { type: "application/json" });

    render(<DataExportSection />);

    await user.click(screen.getByRole("button", { name: "export.importBtn" }));
    await screen.findByRole("button", { name: "export.chooseFileBtn" });

    simulateFileSelection(smallFile);
    await user.click(screen.getByRole("button", { name: "export.chooseFileBtn" }));

    expect(mocks.toast.error).not.toHaveBeenCalledWith("export.importFileTooLarge");
    await screen.findByText("export.importWarningTitle");
  });
});

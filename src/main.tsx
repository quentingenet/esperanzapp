import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import i18next from "i18next";
import "@/i18n";
import App from "./App";
import { DbErrorScreen } from "./components/shared/DbErrorScreen";
import { initDatabase } from "@/db/client";
import { logError } from "@/utils/logger";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    logError("ErrorBoundary", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>
            {i18next.t("app.crash", {
              defaultValue: "Something went wrong. Please restart the app.",
            })}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

async function bootstrap() {
  let dbFailed = false;
  try {
    await initDatabase();
  } catch {
    if (Capacitor.isNativePlatform()) dbFailed = true;
  }

  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>{dbFailed ? <DbErrorScreen /> : <App />}</ErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();

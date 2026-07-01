import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import "@/i18n";
import App from "./App";
import { DbErrorScreen } from "./components/shared/DbErrorScreen";
import { initDatabase } from "@/db/client";

async function bootstrap() {
  let dbFailed = false;
  try {
    await initDatabase();
  } catch {
    if (Capacitor.isNativePlatform()) dbFailed = true;
    // on web: SQLite WASM not available in browser dev — expected
  }

  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      {dbFailed ? <DbErrorScreen /> : <App />}
    </StrictMode>,
  );
}

void bootstrap();

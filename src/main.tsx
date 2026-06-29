import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/i18n";
import App from "./App";
import { initDatabase } from "@/db/client";

async function bootstrap() {
  try {
    await initDatabase();
  } catch {
    // DB init may fail in test/web fallback env — app handles gracefully
  }

  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();

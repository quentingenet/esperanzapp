import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import "@/i18n";
import App from "./App";
import { initDatabase } from "@/db/client";

async function bootstrap() {
  let dbFailed = false;
  try {
    await initDatabase();
  } catch {
    if (Capacitor.isNativePlatform()) dbFailed = true;
    // on web: expected — SQLite WASM not available in browser dev
  }

  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  if (dbFailed) {
    root.innerHTML =
      '<div style="padding:32px;font-family:sans-serif;text-align:center">' +
      "<h2>⚠️ Erreur de démarrage</h2>" +
      "<p>La base de données n'a pas pu être initialisée.<br>Veuillez redémarrer l'application.</p>" +
      "</div>";
    return;
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();

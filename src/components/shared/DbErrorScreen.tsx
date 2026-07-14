import { useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteStaleDatabase, initDatabase } from "@/db/client";

type Busy = "idle" | "retrying" | "resetting";

export function DbErrorScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Busy>("idle");
  const [resetFailed, setResetFailed] = useState(false);

  // A first failure can be transient (native plugin hiccup, timing issue at boot) rather than a
  // genuinely corrupt/undecryptable file. initDatabase() resets its own initPromise on failure
  // (see client.ts), so a plain retry is safe and much less destructive than a full reset.
  const handleRetry = async () => {
    setBusy("retrying");
    try {
      await initDatabase();
      window.location.reload();
    } catch {
      setBusy("idle");
    }
  };

  const handleReset = async () => {
    // Irreversible: wipes the local encrypted DB file. Require an explicit confirmation instead
    // of letting a single stray tap on the only button on screen delete everything.
    if (!window.confirm(t("startup.dbErrorResetConfirm"))) return;
    setBusy("resetting");
    try {
      await deleteStaleDatabase();
      window.location.reload();
    } catch {
      // delete() failed: reloading would cause an infinite reset loop.
      // Ask the user to reinstall instead.
      setBusy("idle");
      setResetFailed(true);
    }
  };

  return (
    <div
      style={{
        padding: "32px",
        fontFamily: "sans-serif",
        textAlign: "center",
        maxWidth: "480px",
        margin: "0 auto",
        marginTop: "64px",
      }}
    >
      <h2 style={{ color: "#c62828", marginBottom: "16px" }}>{t("startup.dbErrorTitle")}</h2>
      <p style={{ color: "#555", lineHeight: 1.6, marginBottom: "32px" }}>
        {resetFailed ? t("startup.dbErrorResetFailed") : t("startup.dbErrorBody")}
      </p>
      {!resetFailed && (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              void handleRetry();
            }}
            disabled={busy !== "idle"}
            style={{
              padding: "14px 28px",
              backgroundColor: busy !== "idle" ? "#aaa" : "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: busy !== "idle" ? "not-allowed" : "pointer",
            }}
          >
            {busy === "retrying" ? "..." : t("startup.dbErrorRetry")}
          </button>
          <button
            onClick={() => {
              void handleReset();
            }}
            disabled={busy !== "idle"}
            style={{
              padding: "14px 28px",
              backgroundColor: busy !== "idle" ? "#aaa" : "#c62828",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: busy !== "idle" ? "not-allowed" : "pointer",
            }}
          >
            {busy === "resetting" ? "..." : t("startup.dbErrorReset")}
          </button>
        </div>
      )}
    </div>
  );
}

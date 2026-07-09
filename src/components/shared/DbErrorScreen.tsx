import { useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteStaleDatabase } from "@/db/client";

export function DbErrorScreen() {
  const { t } = useTranslation();
  const [resetting, setResetting] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await deleteStaleDatabase();
      window.location.reload();
    } catch {
      // delete() failed: reloading would cause an infinite reset loop.
      // Ask the user to reinstall instead.
      setResetting(false);
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
        <button
          onClick={() => {
            void handleReset();
          }}
          disabled={resetting}
          style={{
            padding: "14px 28px",
            backgroundColor: resetting ? "#aaa" : "#c62828",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: resetting ? "not-allowed" : "pointer",
          }}
        >
          {resetting ? "..." : t("startup.dbErrorReset")}
        </button>
      )}
    </div>
  );
}

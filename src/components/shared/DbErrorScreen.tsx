import { useTranslation } from "react-i18next";

export function DbErrorScreen() {
  const { t } = useTranslation();
  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif", textAlign: "center" }}>
      <h2>{t("startup.dbErrorTitle")}</h2>
      <p>{t("startup.dbErrorBody")}</p>
    </div>
  );
}

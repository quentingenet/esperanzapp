import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { BuildHabitsTab, ReduceHabitsTab } from "@/components/home";
import { useHomeTabStore } from "@/store/homeTabStore";

export function Home() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  // Reactive rather than a one-shot lazy initializer: Home may already be mounted (e.g. the
  // user is already on the Home tab) when a notification tap requests a sub-tab, in which case
  // there is no remount to consume the pending tab at. Subscribing here picks it up whenever it
  // arrives, not just at mount.
  const pendingTab = useHomeTabStore((s) => s.pendingTab);
  useEffect(() => {
    if (pendingTab === null) return;
    // Deferred to a microtask: react-hooks/set-state-in-effect forbids calling a React setState
    // synchronously in the body of an effect (same convention as ReduceHabitsTab's async resolution).
    void Promise.resolve().then(() => {
      const consumed = useHomeTabStore.getState().consumePendingTab();
      if (consumed) setTab(consumed === "build" ? 1 : 0);
    });
  }, [pendingTab]);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.default",
          borderBottom: 1,
          borderColor: "divider",
          pt: "env(safe-area-inset-top)",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v: number) => {
            setTab(v);
          }}
          variant="fullWidth"
        >
          <Tab label={t("common.tabs.reduce")} aria-label={t("common.tabs.reduce")} />
          <Tab label={t("common.tabs.build")} aria-label={t("common.tabs.build")} />
        </Tabs>
      </Box>

      {tab === 0 && <ReduceHabitsTab />}
      {tab === 1 && <BuildHabitsTab />}
    </Box>
  );
}

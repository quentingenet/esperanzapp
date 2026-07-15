import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quentingenet.esperanzapp",
  appName: "EsperanzApp",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      // This is only the worst-case fallback ceiling: App.tsx's SplashHider already calls
      // SplashScreen.hide() manually as soon as the app mounts (i.e. right after
      // initDatabase() resolves in main.tsx), so the splash is dismissed well before this
      // in the normal path. Kept short in case that manual hide is ever delayed/never fires.
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      showSpinner: false,
      fadeOutDuration: 200,
    },
    CapacitorSQLite: {
      androidIsEncryption: true,
    },
  },
};

export default config;

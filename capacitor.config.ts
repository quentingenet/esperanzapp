import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quentingenet.esperanzapp",
  appName: "EsperanzApp",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchShowDuration: 8000,
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

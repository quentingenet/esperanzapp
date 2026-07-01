# EsperanzApp

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=Capacitor&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![F-Droid](https://img.shields.io/badge/F--Droid-1976D2?style=for-the-badge&logo=f-droid&logoColor=white)
![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)

<p align="center">
  <img src="https://raw.githubusercontent.com/quentingenet/esperanzapp/main/assets/logo-app-store.png" alt="EsperanzApp" width="720"/>
</p>

**EsperanzApp** is a free, open-source, and privacy-first mobile application to help you break free from toxic habits and addictions, one day at a time.

No account. No server. No tracking. Everything stays on your device.

> *Esperanza* : hope, in Spanish.

---

## Why EsperanzApp?

Breaking a habit is hard. Most apps make it harder: they require accounts, harvest your data, or shame you when you relapse.

EsperanzApp does none of that. It counts your days with you, celebrates your milestones, and, when a relapse happens, it reminds you that those days counted and that you can start again.

---

## Features

🔢 **Day Counter**
Track your streak since the last relapse for each habit. Every day counts, and EsperanzApp counts with you.

🏆 **Milestones**
1 day, 7 days, 30 days, 90 days, 1 year… Each milestone is celebrated.

🔄 **Relapse, without shame**
If you relapse, those days are not erased. Press "Start again" and keep going. The journey continues.

💊 **Treatment Tracker**
Log your daily treatments or medications alongside your habits.

📊 **Stats & History**
Charts, streaks, history timeline: visualize your progress and understand your patterns.

🌍 **7 languages**
French · English · Spanish · German · Portuguese (BR) · Dutch · Italian, with full i18n support.

🔒 **100% private by design**
No account required. No internet connection needed. All data lives in a local SQLite database on your device. Nothing ever leaves your phone.

📤 **Export your data**
Export your history as JSON or CSV at any time, and save it wherever you want. Your data belongs to you.

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript + MUI v9 |
| Build | Vite 8 |
| Mobile | Capacitor v8 (Android) |
| State | Zustand v5 |
| Database | SQLite via `@capacitor-community/sqlite` |
| i18n | i18next (7 locales) |
| Tests | Vitest + Testing Library |

---

## Get the app

### F-Droid *(coming soon)*

EsperanzApp is GPL-3.0 licensed and will be submitted to [F-Droid](https://f-droid.org/), the free and open-source Android app store. No Google account needed, no tracking, built directly from source by F-Droid's infrastructure.

> Submission in progress. Watch this repo for updates.

### Build from source

See instructions below.

---

## Run locally (development)

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [npm](https://www.npmjs.com/)
- Android Studio + Android SDK (for device/emulator builds)

### Clone

```bash
git clone https://github.com/quentingenet/esperanzapp.git
cd esperanzapp
```

### Install & run in browser

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build & run on Android

```bash
npm run build
npx cap sync android
npx cap run android   # requires a connected device or emulator
```

Or open in Android Studio:

```bash
npx cap open android
```

### Tests

```bash
npm run test
```

### Lint

```bash
npm run lint
```

---

## Build a signed release (Android)

```bash
# 1. Build web assets
npm run build && npx cap sync android

# 2. Generate signed AAB (Play Store) or APK (F-Droid / sideload)
cd android
./gradlew bundleRelease   # AAB
./gradlew assembleRelease # APK
```

Output: `android/app/build/outputs/`

---

## Android permissions

EsperanzApp requests the **minimum permissions necessary** to function. No internet access, no contacts, no camera, no location.

| Permission | Prompted? | Requested by | Why |
|---|---|---|---|
| `POST_NOTIFICATIONS` | **Yes** (Android 13+) | You, when adding your first treatment | To send daily reminders to take your medication. You can decline: the app works fully, you just won't receive notifications. |
| `RECEIVE_BOOT_COMPLETED` | No (automatic) | `@capacitor/local-notifications` | Re-schedules your treatment reminders after a phone restart, so they don't disappear when you reboot. |
| `WAKE_LOCK` | No (automatic) | `@capacitor/local-notifications` | Allows the system to briefly wake the screen to display a notification. Standard for any reminder app. |
| `VIBRATE` | No (automatic) | App | Allows notifications to vibrate. No prompt, no personal data. |

**No** `INTERNET`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `ACCESS_FINE_LOCATION`, `READ_CONTACTS`, or any other sensitive permission is requested.

### How file export works

The app offers two export paths.

**Share** writes the file to the app's private cache, a temporary folder only EsperanzApp can access, then opens the Android Share Sheet so you pick the destination (file manager, cloud storage, email, USB, etc.). The app hands the file off to your chosen app and immediately loses access to it.

**Save to phone** writes the file directly to the `Documents` folder on the device, accessible through any file manager. This folder is not private app storage: on Android 9 and earlier it may be readable by other apps with storage permissions, and on Android 10+ scoped storage applies but the folder remains browsable. The in-app warning shown before saving makes this explicit.

---

## Privacy policy

EsperanzApp collects **no data whatsoever**. There is no backend, no analytics, no crash reporting, no third-party SDK that phones home.

The only storage used is the local SQLite database on your device, and `localStorage` for your language preference.

---

## Contributing

Contributions are welcome: bug reports, translations, UI improvements, or new features.

1. Fork this repository
2. Create a feature branch from `main`: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

Please keep pull requests focused and small. One feature or fix per PR.

---

## License

EsperanzApp is released under the **GNU General Public License v3.0**.

This means you are free to:
- Use it
- Study and modify it
- Share it
- Share your modifications, under the same license

See [LICENSE](LICENSE) for the full text.

---

## Author

**Quentin Genet**

If you find EsperanzApp useful, a ⭐ on GitHub goes a long way.

# Privacy Policy for EsperanzApp

_Last updated: July 7, 2026_

## 1. Overview

EsperanzApp is a personal wellness mobile application designed to help users track their habits and treatments. It is developed and maintained by Quentin Genet.

## 2. Data Collection

EsperanzApp does not collect personal data through any external server. There is no backend, no user account, and no mechanism for EsperanzApp to receive or store data about you.

All health data you enter in the application (habits, treatments, logs) is stored exclusively on your device in a local SQLite database. No health data is automatically transmitted by EsperanzApp. Health data may leave the device only if you explicitly export or share it using the built-in export feature.

Two non-medical items are stored in your browser's `localStorage`: your language preference and your onboarding completion status. These items remain on your device, are not transmitted to any server, and do not contain personal health information.

**Update check.** The application checks at startup whether a newer version is available, using the Google Play In-App Updates API (`@capawesome/capacitor-app-update`). This call is made through Google Play Services and does not transmit any health data. The information exchanged is limited to identifying the current installed version of the application and retrieving the latest available version from the Play Store. This call is subject to Google's own privacy practices for the Google Play platform. The same check is also available manually via the "Check for updates" button in Settings.

**Exact alarm scheduling.** The primary purpose of EsperanzApp is to remind users to take their treatments and medications at a specific time they have chosen. To fulfil this purpose reliably, the application uses the `SCHEDULE_EXACT_ALARM` permission on Android 12 and later. This permission is the technical requirement for scheduling a notification that fires at a precise moment rather than within a loose time window defined by the operating system. Exact scheduling is not a secondary feature: it is the reason a user configures a reminder time in the first place. A medication reminder that fires 10 or 20 minutes late is not an acceptable outcome for someone following a treatment schedule. The permission is granted automatically on Android 12 and 13. On Android 14 and later, the user explicitly enables it through the dedicated system screen for "Alarms and Reminders" specific to EsperanzApp; the application detects when the permission is missing and opens this screen automatically. This permission is used solely for scheduling treatment and medication reminders. No personal data is transmitted, collected, or shared as part of this process. Treatment reminders are identified by names freely chosen by the user. The application does not require or suggest any specific medication name, dosage, or clinical detail. A reminder can simply be labelled "Morning routine" or "My evening treatment" or any other label the user prefers.

## 3. Data We Do Not Collect

No user account or authentication is required. No email address or identifier is collected. No location data is collected. No biometric data is collected. No cookies or third-party trackers are used. No analytics or behavioral tracking SDK is integrated in the application itself.

Note that downloading EsperanzApp through Google Play is subject to Google's data practices for the Play Store platform. EsperanzApp has no control over and no visibility into the metadata that Google may collect at the platform level (such as install counts, device model, or country). These practices are governed by Google's own privacy policy.

## 4. Data Sharing

Your data is never sold, shared, or automatically transmitted to any third party. EsperanzApp does not include any advertising SDK or third-party analytics service.

## 5. Data Export

EsperanzApp lets you export your data as a JSON or CSV file. The exported file contains all your habits, treatments, and logs. EsperanzApp never transmits this file to any server; it always stays on your device until you decide otherwise.

The app offers two export paths. The **Share** option writes the file to the app's private cache directory, a temporary folder that only EsperanzApp can access, then opens the Android Share Sheet so you can choose where to send it. After a successful share, EsperanzApp schedules deletion of its temporary copy after a short grace period so the receiving application has time to read it. If sharing is cancelled, deletion is attempted immediately. Cache cleanup is best-effort and the operating system may also remove cached files automatically. EsperanzApp has no knowledge of where the receiving application stores the shared file and is not responsible for how that application handles the data.

The **Save to phone** option writes the file to the app's private Documents folder on your device (`Android/data/com.quentingenet.esperanzapp/files/Documents/`). On Android 11 and later, this folder is not accessible to third-party file managers due to system scoped-storage restrictions; it can be browsed using your device's built-in Files app or accessed via USB. EsperanzApp is not responsible for access granted to that folder by the operating system or by apps you have authorized.

In both cases, the exported file contains personal health information. **If you export without a password, the file is unencrypted and readable by anyone who can access it.** We strongly recommend using the password-protected encryption option available in the export dialog, which encrypts the file with AES-GCM before it leaves the application. This password is never stored by EsperanzApp; keep it safe, as it will be required to reimport the file.

## 6. Storage and Security

Data is stored locally on your device in a SQLite database encrypted at rest using AES-256. The encryption key is generated randomly at first launch and stored via the Android Keystore system (iOS Keychain on iOS), the platform's standard secure credential storage. Where supported by the device hardware, the Keystore provides an additional layer of hardware-level protection; on devices without dedicated security hardware, protection is software-based. The stored key is not accessible to other applications.

**Uninstalling the application permanently and irreversibly deletes both the database and the Keystore-backed encryption key.** Any data on the device is then permanently lost and unrecoverable. The only way to preserve your data across uninstalls, device changes, or resets is to export it beforehand using the in-app export feature.

The optional export encryption feature (described in Section 5) uses a separate password chosen by you and processed entirely on-device via the Web Crypto API (PBKDF2-HMAC-SHA256 + AES-GCM). This password is never stored by EsperanzApp.

We recommend making regular backups using the export feature available in the application.

This encryption relies on SQLCipher Community Edition (Copyright 2008 to 2025 Zetetic LLC, BSD license). See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for the full license text.

## 7. Children

EsperanzApp is not intended for children under the age of 13 and does not knowingly collect any data from them.

## 8. Changes to This Policy

This privacy policy may be updated from time to time. Any changes will be published on this page with an updated date.

## 9. Medical disclaimer

EsperanzApp is a personal habit and routine tracking application. It is not a medical device and does not provide medical advice, diagnosis, or treatment recommendations. It does not replace a qualified healthcare professional. Any decision relating to a medical treatment, medication schedule, or health condition should be made in consultation with a licensed healthcare provider.

## 10. Contact

For any privacy-related questions: [contact@quentingenet.fr](mailto:contact@quentingenet.fr)

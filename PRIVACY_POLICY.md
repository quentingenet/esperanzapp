# Privacy Policy for EsperanzApp

*Last updated: July 2, 2026*

## 1. Overview

EsperanzApp is a personal wellness mobile application designed to help users track their habits and treatments. It is developed and maintained by Quentin Genet.

## 2. Data Collection

EsperanzApp does **not collect any personal data** through an external server.

All data you enter in the application (habits, treatments, logs) is stored **exclusively on your device**, in a local SQLite database. **No data is automatically transmitted by EsperanzApp.** Data may leave the device only if you explicitly export or share it using the built-in export feature.

## 3. Data We Do Not Collect

No user account or authentication is required.
No email address or identifier is collected.
No location data is collected.
No biometric data is collected.
No cookies or trackers are used.
No analytics or behavioral tracking tools are integrated.

## 4. Data Sharing

Your data is never sold, shared, or automatically transmitted to any third party. EsperanzApp does not include any advertising SDK or third-party analytics service.

## 5. Data Export

EsperanzApp lets you export your data as a JSON or CSV file. The exported file contains all your habits, treatments, and logs. EsperanzApp never transmits this file to any server; it always stays on your device until you decide otherwise.

The app offers two export paths. The **Share** option writes the file to the app's private cache directory, a temporary folder that only EsperanzApp can access, then opens the Android Share Sheet so you can choose where to send it. Once you make that choice, EsperanzApp hands the file off and immediately loses access to it. It has no knowledge of where the file ends up, and is not responsible for how the application or service you selected handles the data.

The **Save to phone** option writes the file directly to the `Documents` folder on your device, where it can be found using a file manager. Unlike the private cache, this folder may be accessible to other apps depending on your Android version and any permissions you have granted. EsperanzApp is not responsible for access granted to that folder by the operating system or by apps you have authorized.

In both cases, the exported file contains personal health information. We recommend treating it accordingly.

## 6. Storage and Security

Data is stored locally on your device in a SQLite database encrypted at rest using AES-256 (SQLCipher). The encryption key is generated randomly at first launch and stored via the Android Keystore system (iOS Keychain on iOS), the platform's standard secure credential storage. Where supported by the device hardware, the Keystore provides an additional layer of hardware-level protection; on devices without dedicated security hardware, protection is software-based. The stored key is not accessible to other applications.

**Uninstalling the application permanently and irreversibly deletes both the database and the Keystore-backed encryption key.** Any data on the device is then permanently lost and unrecoverable. The only way to preserve your data across uninstalls, device changes, or resets is to export it beforehand using the in-app export feature.

The optional export encryption feature (described in Section 5) uses a separate password chosen by you and processed entirely on-device via the Web Crypto API (PBKDF2-HMAC-SHA256 + AES-GCM). This password is never stored by EsperanzApp.

We recommend making regular backups using the export feature available in the application.

## 7. Children

EsperanzApp is not intended for children under the age of 13 and does not knowingly collect any data from them.

## 8. Changes to This Policy

This privacy policy may be updated from time to time. Any changes will be published on this page with an updated date.

## 9. Contact

For any privacy-related questions: [contact@quentingenet.fr](mailto:contact@quentingenet.fr)

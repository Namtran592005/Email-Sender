<div align="center">

# Email Sender

**Compose and send polished HTML emails from your phone — nicer than plain text, without the clutter.**

[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](#)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](#)
[![Android](https://img.shields.io/badge/Android-ready-3DDC84?logo=android&logoColor=black)](#)

**English** · [Tiếng Việt](README.vi.md)

</div>

---

## Screenshots

| Home | Compose | Preview |
|:--:|:--:|:--:|
| ![](Screenshots/trangchu.jpg) | ![](Screenshots/soanemailwrite.jpg) | ![](Screenshots/soanemailpreview.jpg) |

| Cc / Bcc | Cc / Bcc list | Sent email detail |
|:--:|:--:|:--:|
| ![](Screenshots/ccv&bcc.jpg) | ![](Screenshots/bcclist.jpg) | ![](Screenshots/emaildaguichitiet.jpg) |

| Received on mobile | Received on desktop |
|:--:|:--:|
| ![](Screenshots/gmailnguoinhan-mobile.jpg) | ![](Screenshots/gmailnguoinhan-desktop.jpg) |

---

## Overview

Email Sender is an Android app for composing styled HTML emails with a rich-text editor. It supports bold, italic, underline, lists, quotes, links, and text colors, plus a raw HTML editor and an exact preview before sending.

The app talks directly to SMTP using `react-native-tcp-socket`, so there is no backend server or email relay in between.

---

## Features

- **Rich-text composer** with three modes:
  - **Write** — visual editor
  - **Code** — custom HTML input with editor-like highlighting
  - **Preview** — shows the rendered email before sending
- **Multiple SMTP accounts** — add, edit, delete, choose a default account, and test the connection before saving
- **Email templates** — create reusable HTML templates, save one as default, and start new messages from it
- **Automatic drafts** — the message being composed is saved automatically and can be restored from the **Drafts** tab
- **Sent history** — view previously sent messages and their rendered HTML, or delete entries
- **Cc / Bcc** — add multiple addresses and paste bulk email lists
- **Attachments** — choose files from the device
- **Home tabs** — Templates, Drafts, and Sent
- **Settings** — manage SMTP accounts and clear all local app data
- Light design with black-and-white styling, gold accents, and the **Inter** font

---

## Tech Stack

| Layer | Used |
|:--|:--|
| Mobile framework | Expo SDK 57 + React Native 0.86 |
| Language | JavaScript (JSX), React 19 |
| Navigation | React Navigation native-stack + bottom-tabs |
| SMTP transport | `react-native-tcp-socket` (direct client-side SMTP) |
| Email preview | `react-native-webview` |
| Local storage | `@react-native-async-storage/async-storage` |
| File picking | `expo-document-picker`, `expo-file-system` |
| UI | Inter fonts, Expo vector icons, custom theme |

---

## Requirements

- **Node.js 20+** (recommended) and **npm 10+**
- **Android Studio** for local Android builds
- An Android device or emulator
- **Expo CLI** via `npx expo`
- For APK builds: an **Expo / EAS** account and the EAS CLI (`eas build`)

> Because the app uses the native `react-native-tcp-socket` module, it **cannot run in Expo Go**. Use an Expo dev client or an EAS build.

---

## Getting Started

```bash
git clone https://github.com/Namtran592005/Email-Sender.git
cd Email-Sender/app

npm install
```

### Run with a dev client

```bash
npx expo prebuild --platform android
npx expo run:android
```

Or start the dev client server:

```bash
npm start
```

### Build an APK with EAS

```bash
npx eas-cli build --platform android --profile preview
```

`eas.json` defines:

| Profile | Purpose |
|:--|:--|
| `development` | Internal distribution with development client enabled |
| `preview` | Internal Android APK |
| `production` | Production Android APK |

---

## SMTP Configuration

Open **Settings** in the app and add an SMTP account.

| Field | Example |
|:--|:--|
| Host | `smtp.gmail.com` |
| Port | `465` with TLS enabled |
| Username | your email address |
| Password | App password for Gmail |
| Sender name | Display name |
| Sender email | Sending address |

Use **Test connection** to verify the server, authentication, and TLS/STARTTLS settings before saving.

The SMTP client supports:

- Implicit TLS (for example port `465`)
- STARTTLS (for example ports `587` and `25`)
- `AUTH PLAIN` with fallback to `AUTH LOGIN`
- UTF-8 encoded headers
- MIME multipart messages with attachments
- Long-running session timeouts and reply parsing

---

## Local Data

The app stores everything locally with AsyncStorage:

| Data | Storage key |
|:--|:--|
| SMTP accounts | `@email_sender/smtp_accounts` |
| Default SMTP account | `@email_sender/smtp_default_id` |
| Drafts | `@email_sender/drafts` |
| Last edited draft | `@email_sender/last_draft_id` |
| Sent history | `@email_sender/sent` |
| Custom templates | `@email_sender/custom_templates` |
| Default template | `@email_sender/default_template` |

Limits in code:

- Drafts: **20** most recent
- Sent history: **60** most recent
- Attachments per message: **12**

> ⚠️ SMTP passwords are stored in AsyncStorage on the device. This is convenient for a personal app, but avoid using it on shared or untrusted devices.

---

## Project Structure

```text
.
├── app/                          # Expo / React Native application
│   ├── App.js                    # Root navigation, fonts, splash/fade-in
│   ├── app.json                  # Expo app config and Android package name
│   ├── eas.json                  # EAS build profiles
│   ├── index.js                  # Native entry point
│   └── src/
│       ├── screens/              # Home, Compose, Drafts, Sent, Settings, Templates
│       ├── components/           # RichEditor, Toolbar, TemplateLibrary, CcBccModal, ...
│       ├── smtp.js               # Direct SMTP client
│       ├── smtpConfig.js         # SMTP account storage
│       ├── templates.js          # Template storage
│       ├── drafts.js             # Draft storage
│       ├── sent.js               # Sent history storage
│       ├── emailHtml.js          # Email HTML wrapper
│       ├── clearData.js          # Remove all local app data
│       └── theme.js              # Palette, fonts, spacing, shadows
├── Screenshots/                  # App screenshots
└── README.md                     # English documentation
└── README.vi.md                  # Vietnamese documentation
```

---

## App Flow

1. If no SMTP account is configured, the app opens **Settings** first.
2. After setup, **Home** shows three tabs:

   | Tab | Purpose |
   |:--|:--|
   | Templates | Create and reuse email templates |
   | Drafts | Resume automatically saved messages |
   | Sent | Review messages already sent |

3. **Compose** opens as a modal with the visual editor, code editor, and preview.
4. The user picks an SMTP account, addresses, subject, body, and attachments.
5. After sending, the app records the message in local Sent history.

---

## License

No license file is currently included in this repository. For corrections, feedback, or copyright questions: [@Namtran592005](https://github.com/Namtran592005).

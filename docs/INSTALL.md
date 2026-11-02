# Installation Guide: Lead Capture - Local

This guide explains how to install, verify, and run the **Lead Capture - Local** browser extension in Chromium-based browsers (Google Chrome and Microsoft Edge).

---

## 1. Prerequisites

- **Google Chrome** (version 100+) or **Microsoft Edge** (version 100+).
- Node.js (version 18+ recommended) if running automated unit/integration tests locally.

---

## 2. Installing in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the address bar.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left corner, click **Load unpacked**.
5. Select this project root folder:
   ```text
   C:\Users\user\Downloads\LeadGenerationExtension
   ```
6. The extension **Lead Capture - Local (v0.1.0)** will appear in your installed extensions list.
7. Click the **Extensions puzzle piece** icon in Chrome's toolbar and pin **Lead Capture** for easy access.

---

## 3. Installing in Microsoft Edge

1. Open Microsoft Edge.
2. Navigate to `edge://extensions/` in the address bar.
3. In the left sidebar, toggle **Developer mode** to **ON**.
4. Click **Load unpacked**.
5. Select this project folder (`LeadGenerationExtension`).
6. Confirm the extension is active and pin it to the Edge toolbar.

---

## 4. Verification & First Scan

1. Open any public business webpage containing contact details (or load one of the test fixtures, e.g. `tests/fixtures/valid-contacts.html`).
2. Click the **Lead Capture** extension icon in the browser toolbar.
3. The popup will display the active page title, URL domain, and a green **Ready to Scan** badge.
4. Click **Scan Current Page**.
5. The scan results will immediately display:
   - Total Leads Found
   - Valid Emails
   - Valid Phones
   - Duplicates Ignored
6. Click **Open Lead Review** to view, edit, approve, or export the captured leads as CSV or TXT.

---

## 5. Running Automated Tests

To run the complete automated test suite (86 assertions across normalization, regex extraction, deduplication, CSV formula injection protection, and synthetic HTML fixtures):

```bash
npm test
```
All tests run locally in Node.js without requiring external server dependencies.


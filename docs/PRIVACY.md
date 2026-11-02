# Privacy Disclosure & Compliance Manifesto

**Extension Name**: Lead Capture - Local  
**Architecture**: Local-First, Zero Telemetry, Manifest V3  
**Effective Date**: October 2026  

---

## 1. Zero Telemetry & On-Device Processing

- **No Remote Network Calls**: The extension initiates **zero** external HTTP/HTTPS requests to remote analytics, tracking, or cloud servers.
- **Local Data Persistence**: All captured lead data and user preferences are saved strictly within your browser's local sandbox using `chrome.storage.local`.
- **No Third-Party SDKs**: No Google Analytics, Mixpanel, Sentry, or third-party telemetry libraries are embedded or executed.

---

## 2. Permissions Justification (Least Privilege)

The extension requests only four permissions strictly required for user-initiated workflows:

| Permission | Technical Justification |
| :--- | :--- |
| `activeTab` | Grants temporary DOM inspection rights to the active tab *only* after the user explicitly clicks the extension icon. |
| `scripting` | Enables programmatic injection of the scanning function (`executeScript`) upon explicit user gesture ("Scan Current Page"). |
| `storage` | Provides local persistence (`chrome.storage.local`) for saved leads and user settings on your machine. |
| `downloads` | Allows exporting curated leads into RFC 4180 CSV or TXT files upon explicit user click. |

*Note: The extension declares NO persistent `host_permissions` (`<all_urls>`). It cannot inspect or read any web page until you interact with it.*

---

## 3. Scope & Prohibited Activities

The extension is designed exclusively for manual, transparent inspection of public business contact details:
- **No Background Crawling**: The extension never runs automated scrapers, pagination loops, or background polling.
- **No Credential Bypassing**: The extension never attempts to circumvent logins, paywalls, CAPTCHAs, or platform access restrictions.
- **No Social Network Scraping**: The extension strictly complies with platform boundaries on LinkedIn, Facebook, and similar social networks; it does not harvest private profiles or bulk messages.

---

## 4. User Control & Data Retention

- **User Review Gate**: Extracted leads are never automatically dispatched. Users have complete discretion to approve, edit, or reject leads in the Review Manager.
- **Instant Deletion ("Clear All Data")**: Users can irrevocably delete all stored records at any time via the Popup, Review Manager, or Settings page.
- **Uninstallation**: Removing the extension instantly erases all local data stored within the extension's sandbox.

---

## 5. Security & Spreadsheet Safety

- **CSV Formula Injection Mitigation**: All exported CSV cells are audited. Any field beginning with formula-trigger characters (`=`, `+`, `-`, `@`) is safely prefixed with a single quote (`'`) to protect spreadsheet applications (e.g. Microsoft Excel, LibreOffice, Google Sheets) from remote code execution.
- **XSS Prevention**: Extracted strings are rendered strictly via DOM `.textContent` or parameterized elements, completely eliminating raw HTML injection vulnerabilities.


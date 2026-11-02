# Lead Capture - Local (Browser Extension)

> A user-controlled, local-first Manifest V3 Chromium browser extension for discovering, curating, and selectively exporting public contact details visible on active web pages.

---

## Highlights

- **On-Device Only**: Zero remote telemetry, no external servers, and zero data uploads.
- **User-Initiated Scanning**: Operates strictly when the user clicks **"Scan Current Page"**; never silently tracks browsing or injects background scrapers.
- **Review Before Export**: Curate, edit, and approve leads in an interactive data table before saving or exporting.
- **Enterprise-Grade Export**: RFC 4180-compliant CSV and pipe-delimited TXT outputs with **Spreadsheet Formula Injection Mitigation** (`=, +, -, @` escaping) and UTF-8 BOM encoding.
- **Least-Privilege Security**: Employs `activeTab`, `scripting`, `storage`, and `downloads`—no broad persistent `host_permissions` declared.

---

## Architecture & Directory Structure

```text
LeadGenerationExtension/
├── manifest.json              # Manifest V3 configuration (least privilege)
├── package.json               # Development & test runner scripts
├── architecture.md            # Detailed architecture & technical specification
├── README.md                  # Project overview & documentation
├── icons/                     # Extension icons (16px, 48px, 128px PNGs + SVG)
├── src/
│   ├── background/
│   │   └── service-worker.js  # MV3 Service worker (routing, injection, downloads)
│   ├── content/
│   │   └── scan-page.js       # Content script DOM reader (capped text, links, JSON-LD)
│   ├── core/
│   │   ├── types.js           # Type definitions, defaults & schemas
│   │   ├── normalize.js       # E.164 phone, clean email & URL normalizer
│   │   ├── extract.js         # Pure extraction engine (mailto/tel/regex/schema)
│   │   └── dedupe.js          # Candidate key deduplication & merge engine
│   ├── storage/
│   │   └── leads-repository.js # Local storage CRUD & schema versioning
│   ├── export/
│   │   ├── csv.js             # RFC 4180 CSV builder with formula safety
│   │   └── txt.js             # Pipe-delimited TXT builder
│   └── ui/
│       ├── popup.html / .js / .css    # Action popup (scan trigger & results)
│       ├── review.html / .js / .css   # Interactive curation & review table
│       └── options.html / .js         # Extension settings & clear data
├── tests/
│   ├── fixtures/              # Synthetic HTML test fixtures
│   ├── normalize.test.js      # Normalization unit tests
│   ├── extraction.test.js     # Extraction unit tests
│   ├── dedupe.test.js         # Deduplication unit tests
│   ├── export.test.js         # Export engine unit tests
│   ├── fixtures.test.js       # End-to-end HTML fixture tests
│   └── run-tests.js           # Master test runner
└── docs/
    ├── INSTALL.md             # Chrome & Edge installation steps
    ├── PRIVACY.md             # Privacy policy & compliance disclosure
    └── TEST-REPORT.md         # Comprehensive test report & verification matrix
```

---

## Quick Start & Installation

### 1. Load Unpacked in Google Chrome
1. Navigate to `chrome://extensions/` in Chrome.
2. Toggle **Developer mode** to **ON** (top-right).
3. Click **Load unpacked** (top-left) and select this project folder:
   ```text
   C:\Users\user\Downloads\LeadGenerationExtension
   ```
4. Pin the **Lead Capture** icon to your toolbar.

### 2. Load Unpacked in Microsoft Edge
1. Navigate to `edge://extensions/` in Edge.
2. Toggle **Developer mode** to **ON**.
3. Click **Load unpacked** and select this directory.

---

## Running the Automated Test Suite

Run the full automated test suite (86 assertions across normalization, extraction, deduplication, CSV safety, and HTML fixtures):

```bash
npm test
```

---

## Security & Ethics

- **No Raw innerHTML**: Extracted text is rendered safely using `.textContent` or parameterized elements to prevent DOM XSS.
- **Spreadsheet Protection**: Cells starting with `=`, `+`, `-`, or `@` are safely prefixed with a single quote (`'`) to protect spreadsheet applications from formula injection.
- **No Platform Circumvention**: Designed to respect platform boundaries; does not bypass CAPTCHAs, scrape behind logins, or auto-scroll feeds.

See [docs/PRIVACY.md](file:///c:/Users/user/Downloads/LeadGenerationExtension/docs/PRIVACY.md) and [architecture.md](file:///c:/Users/user/Downloads/LeadGenerationExtension/architecture.md) for complete details.


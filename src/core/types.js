/**
 * Lead Generation Extension - Data Types & Enums
 */

/**
 * @typedef {'high' | 'medium' | 'low'} ConfidenceLevel
 * @typedef {'pending' | 'approved' | 'rejected'} ReviewStatus
 * 
 * @typedef {Object} Lead
 * @property {string} id - Locally generated UUID v4
 * @property {string} [businessName] - Inferred business or organization name
 * @property {string} [contactName] - Contact or person name if detected
 * @property {string} [phone] - Canonicalized E.164 format or standard international format
 * @property {string} [email] - Validated email address
 * @property {string} [website] - Extracted website or source domain
 * @property {string} sourceUrl - Active page URL where lead was captured (required)
 * @property {string} [sourceTitle] - Active page document title
 * @property {string} capturedAt - ISO 8601 UTC timestamp
 * @property {ConfidenceLevel} confidence - Extraction confidence level
 * @property {ReviewStatus} reviewStatus - Approval status in review workflow
 * @property {string} [notes] - User editable notes
 * 
 * @typedef {Object} RawScanPayload
 * @property {string} text - Visible page innerText (capped)
 * @property {string[]} mailtoLinks - mailto: link targets
 * @property {string[]} telLinks - tel: link targets
 * @property {string[]} jsonLdOrgs - Organization names found in JSON-LD
 * @property {string[]} jsonLdPhones - Phones found in JSON-LD
 * @property {string[]} jsonLdEmails - Emails found in JSON-LD
 * @property {string[]} headings - Prominent h1 headings
 * @property {string} title - document.title
 * @property {string} url - location.href
 * 
 * @typedef {Object} ExtensionSettings
 * @property {string} defaultCountry - ISO country code for phone normalization (default 'US')
 * @property {string} defaultCountryCode - Phone prefix like '+1'
 * @property {boolean} stripTrackingParams - Remove utm_* and tracking query params
 * @property {string[]} ignoreDomains - Ignored email domains / placeholders
 * @property {boolean} exportSafeFormulas - Escape spreadsheet formula injection chars
 * @property {number} schemaVersion - Local storage schema version
 */

export const DEFAULT_SETTINGS = {
  defaultCountry: 'US',
  defaultCountryCode: '+1',
  stripTrackingParams: true,
  ignoreDomains: [
    'example.com',
    'example.org',
    'domain.com',
    'email.com',
    'yourdomain.com',
    'sentry.io',
    'wixpress.com',
    'sentry-cdn.com',
    'cloudflare.com',
    'google-analytics.com'
  ],
  exportSafeFormulas: true,
  schemaVersion: 1
};


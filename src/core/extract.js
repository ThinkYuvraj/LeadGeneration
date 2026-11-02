/**
 * Lead Generation Extension - Pure Extraction Engine
 */

import { normalizeEmail, normalizePhone, normalizeUrl, normalizeBusinessName } from './normalize.js';

/**
 * Generate a standard UUID v4 for unique lead identification.
 * Works in both browser and Node.js environments.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Common dummy / placeholder email prefixes or domains to filter out.
 */
const BOGUS_EMAIL_PREFIXES = ['test@', 'demo@', 'user@', 'admin@example', 'yourname@', 'name@'];
const INVALID_EMAIL_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js'];

/**
 * Checks if an email is an ignored placeholder or technical asset.
 * 
 * @param {string} email
 * @param {string[]} [ignoreDomains=[]]
 * @returns {boolean}
 */
export function isIgnoredEmail(email, ignoreDomains = []) {
  if (!email) return true;
  const lower = email.toLowerCase();

  for (const ext of INVALID_EMAIL_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }

  for (const prefix of BOGUS_EMAIL_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }

  const parts = lower.split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1];

  for (const ignored of ignoreDomains) {
    if (domain === ignored || domain.endsWith('.' + ignored)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts emails from raw text and mailto links.
 * 
 * @param {string} text
 * @param {string[]} [mailtoLinks=[]]
 * @param {string[]} [ignoreDomains=[]]
 * @returns {Array<{ email: string, confidence: 'high' | 'medium' }>}
 */
export function extractEmails(text = '', mailtoLinks = [], ignoreDomains = []) {
  const emailMap = new Map();

  // 1. Mailto links (Strong signal -> high confidence)
  for (const link of mailtoLinks) {
    const clean = normalizeEmail(link);
    if (clean && !isIgnoredEmail(clean, ignoreDomains)) {
      emailMap.set(clean, { email: clean, confidence: 'high' });
    }
  }

  // 2. Regex search over visible text (Medium confidence)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  for (const match of matches) {
    const clean = normalizeEmail(match);
    if (clean && !isIgnoredEmail(clean, ignoreDomains) && !emailMap.has(clean)) {
      emailMap.set(clean, { email: clean, confidence: 'medium' });
    }
  }

  return Array.from(emailMap.values());
}

/**
 * Extract phone numbers from raw text and tel: links.
 * 
 * @param {string} text
 * @param {string[]} [telLinks=[]]
 * @param {string} [defaultPrefix='+1']
 * @returns {Array<{ phone: string, confidence: 'high' | 'medium' }>}
 */
export function extractPhones(text = '', telLinks = [], defaultPrefix = '+1') {
  const phoneMap = new Map();

  // 1. Tel links (Strong signal -> high confidence)
  for (const link of telLinks) {
    const clean = normalizePhone(link, defaultPrefix);
    if (clean) {
      phoneMap.set(clean, { phone: clean, confidence: 'high' });
    }
  }

  // 2. Regex for international and standard phone formats
  // Matches +country codes, parentheses, hyphens, dots, spaces: e.g. +1 (555) 123-4567, 555-123-4567
  const phoneRegex = /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}(?:[-.\s]?\d{1,4})?/g;
  const rawMatches = text.match(phoneRegex) || [];

  for (const raw of rawMatches) {
    const digitsOnly = raw.replace(/\D/g, '');
    // Exclude common noise: dates (e.g. 20241027), 4-digit numbers, zip codes (5 digits), or excessively long strings
    if (digitsOnly.length < 7 || digitsOnly.length > 15) continue;

    // Filter out obvious timestamps or repeated sequences like 0000000
    if (/^(\d)\1+$/.test(digitsOnly)) continue;

    const clean = normalizePhone(raw, defaultPrefix);
    if (clean && !phoneMap.has(clean)) {
      phoneMap.set(clean, { phone: clean, confidence: 'medium' });
    }
  }

  return Array.from(phoneMap.values());
}

/**
 * Extracts business name from JSON-LD, headers, or page title.
 * 
 * @param {string[]} [jsonLdOrgs=[]]
 * @param {string[]} [headings=[]]
 * @param {string} [title='']
 * @returns {string}
 */
export function extractBusinessName(jsonLdOrgs = [], headings = [], title = '') {
  // 1. Highest priority: JSON-LD Organization name
  if (jsonLdOrgs.length > 0 && jsonLdOrgs[0].trim()) {
    return normalizeBusinessName(jsonLdOrgs[0]);
  }

  // 2. Prominent H1 if concise and not generic like "Contact Us"
  const genericHeaders = ['contact', 'contact us', 'get in touch', 'home', 'about', 'about us', 'welcome'];
  for (const h of headings) {
    const clean = normalizeBusinessName(h);
    if (clean && clean.length <= 60 && !genericHeaders.includes(clean.toLowerCase())) {
      return clean;
    }
  }

  // 3. Fallback: Parse document title (e.g. "Acme Corp | Contact Us" -> "Acme Corp")
  if (title) {
    const parts = title.split(/[-|—•–]/);
    if (parts.length > 1) {
      for (const part of parts) {
        const clean = normalizeBusinessName(part);
        if (clean && !genericHeaders.includes(clean.toLowerCase()) && clean.length > 2) {
          return clean;
        }
      }
    }
    return normalizeBusinessName(parts[0]);
  }

  return '';
}

/**
 * Master extraction function that processes raw DOM scan payload into structured Leads.
 * Follows the non-overjoining rule: does not falsely combine unrelated phones and emails
 * unless they are explicitly co-located or tied to the page's primary business.
 * 
 * @param {import('./types.js').RawScanPayload} payload
 * @param {import('./types.js').ExtensionSettings} settings
 * @returns {import('./types.js').Lead[]}
 */
export function extractLeadsFromPayload(payload, settings) {
  if (!payload || !payload.url) return [];

  const sourceUrl = normalizeUrl(payload.url, settings?.stripTrackingParams ?? true);
  const sourceTitle = payload.title?.trim() || '';
  const businessName = extractBusinessName(payload.jsonLdOrgs, payload.headings, payload.title);
  const ignoreDomains = settings?.ignoreDomains || [];
  const defaultPrefix = settings?.defaultCountryCode || '+1';

  // 1. Check JSON-LD for pre-coupled organization contacts
  const coupledLeads = [];
  if (payload.jsonLdPhones?.length > 0 || payload.jsonLdEmails?.length > 0) {
    const orgPhone = payload.jsonLdPhones?.[0] ? normalizePhone(payload.jsonLdPhones[0], defaultPrefix) : '';
    const orgEmail = payload.jsonLdEmails?.[0] ? normalizeEmail(payload.jsonLdEmails[0]) : '';

    if ((orgPhone || orgEmail) && (!orgEmail || !isIgnoredEmail(orgEmail, ignoreDomains))) {
      coupledLeads.push({
        id: generateUUID(),
        businessName: businessName || '',
        contactName: '',
        phone: orgPhone || undefined,
        email: orgEmail || undefined,
        website: sourceUrl ? new URL(sourceUrl).origin : '',
        sourceUrl,
        sourceTitle,
        capturedAt: new Date().toISOString(),
        confidence: 'high',
        reviewStatus: 'pending'
      });
    }
  }

  // 2. Extract remaining emails and phones
  const emails = extractEmails(payload.text, payload.mailtoLinks, ignoreDomains);
  const phones = extractPhones(payload.text, payload.telLinks, defaultPrefix);

  // If we already captured via JSON-LD, filter them out to prevent duplicates
  const coupledEmail = coupledLeads[0]?.email;
  const coupledPhone = coupledLeads[0]?.phone;
  const uncoupledEmails = emails.filter(e => e.email !== coupledEmail);
  const uncoupledPhones = phones.filter(p => p.phone !== coupledPhone);

  const finalLeads = [...coupledLeads];

  // If exactly 1 email and 1 phone are found on the page, they likely belong to the same entity
  if (uncoupledEmails.length === 1 && uncoupledPhones.length === 1 && coupledLeads.length === 0) {
    const highestConfidence = (uncoupledEmails[0].confidence === 'high' || uncoupledPhones[0].confidence === 'high')
      ? 'high'
      : 'medium';

    finalLeads.push({
      id: generateUUID(),
      businessName: businessName || '',
      contactName: '',
      phone: uncoupledPhones[0].phone,
      email: uncoupledEmails[0].email,
      website: sourceUrl ? new URL(sourceUrl).origin : '',
      sourceUrl,
      sourceTitle,
      capturedAt: new Date().toISOString(),
      confidence: highestConfidence,
      reviewStatus: 'pending'
    });
    return finalLeads;
  }

  // Otherwise, treat separate contacts independently to prevent false personal identity joins
  for (const e of uncoupledEmails) {
    finalLeads.push({
      id: generateUUID(),
      businessName: businessName || '',
      contactName: '',
      email: e.email,
      website: sourceUrl ? new URL(sourceUrl).origin : '',
      sourceUrl,
      sourceTitle,
      capturedAt: new Date().toISOString(),
      confidence: e.confidence,
      reviewStatus: 'pending'
    });
  }

  for (const p of uncoupledPhones) {
    finalLeads.push({
      id: generateUUID(),
      businessName: businessName || '',
      contactName: '',
      phone: p.phone,
      website: sourceUrl ? new URL(sourceUrl).origin : '',
      sourceUrl,
      sourceTitle,
      capturedAt: new Date().toISOString(),
      confidence: p.confidence,
      reviewStatus: 'pending'
    });
  }

  return finalLeads;
}


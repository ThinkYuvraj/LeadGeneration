/**
 * Lead Generation Extension - Normalization Engine
 */

/**
 * Normalizes an email address.
 * Trims whitespace, strips surrounding punctuation, and lowercases domain/address.
 * 
 * @param {string} email
 * @returns {string} Normalized email or empty string if invalid
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';

  let cleaned = email.trim();

  // Strip mailto: prefix if present
  if (cleaned.toLowerCase().startsWith('mailto:')) {
    cleaned = cleaned.slice(7);
  }

  // Remove query params (e.g., ?subject=...)
  const queryIdx = cleaned.indexOf('?');
  if (queryIdx !== -1) {
    cleaned = cleaned.slice(0, queryIdx);
  }

  // Strip common surrounding punctuation often grabbed by regex
  cleaned = cleaned.replace(/^[<([{"'.,;:]+/, '').replace(/[>\])}"\'.,;:]+$/, '').trim();

  // Validate standard email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleaned)) {
    return '';
  }

  // Lowercase the entire email for consistent deduplication
  return cleaned.toLowerCase();
}

/**
 * Normalizes a phone number to standard international / E.164 representation.
 * 
 * @param {string} phone
 * @param {string} [defaultPrefix='+1'] - Fallback country code prefix if none detected
 * @returns {string} Normalized phone number, or empty string if invalid
 */
export function normalizePhone(phone, defaultPrefix = '+1') {
  if (!phone || typeof phone !== 'string') return '';

  let cleaned = phone.trim();

  // Strip tel: prefix if present
  if (cleaned.toLowerCase().startsWith('tel:')) {
    cleaned = cleaned.slice(4);
  }

  // Remove query params or hash
  const queryIdx = cleaned.search(/[?#;]/);
  if (queryIdx !== -1) {
    cleaned = cleaned.slice(0, queryIdx);
  }

  // Determine if it already has an explicit plus for country code
  const hasPlus = cleaned.startsWith('+');

  // Strip all non-digit characters except the leading plus
  let digits = cleaned.replace(/\D/g, '');

  // If phone starts with 00 (international call prefix), treat as +
  if (digits.startsWith('00') && digits.length > 2) {
    return '+' + digits.slice(2);
  }

  if (hasPlus) {
    // Check E.164 length rules: 7 to 15 digits
    if (digits.length >= 7 && digits.length <= 15) {
      return '+' + digits;
    }
    return '';
  }

  // No explicit +, check length
  if (digits.length === 10) {
    // Common 10-digit number (e.g., US/CA) -> apply default country prefix
    const prefix = defaultPrefix.startsWith('+') ? defaultPrefix : `+${defaultPrefix}`;
    return `${prefix}${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1 (North American with country code)
    return `+${digits}`;
  } else if (digits.length >= 7 && digits.length <= 15) {
    // Valid digit count; if country code prefix provided, use it
    if (defaultPrefix) {
      const prefix = defaultPrefix.startsWith('+') ? defaultPrefix : `+${defaultPrefix}`;
      return `${prefix}${digits}`;
    }
    return digits;
  }

  return '';
}

/**
 * Normalizes a URL and optionally strips common tracking parameters (UTM, ref, etc.)
 * 
 * @param {string} url
 * @param {boolean} [stripTracking=true]
 * @returns {string} Clean URL
 */
export function normalizeUrl(url, stripTracking = true) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    if (stripTracking) {
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'ref', 'source'
      ];
      trackingParams.forEach(param => parsed.searchParams.delete(param));
    }
    // Remove trailing slash for uniformity unless root
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

/**
 * Normalizes business names by cleaning extra whitespace and trailing legal suffixes.
 * 
 * @param {string} name
 * @returns {string}
 */
export function normalizeBusinessName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/\s+/g, ' ').trim();
}


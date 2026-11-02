/**
 * Test Suite: Normalization Engine
 */

import { normalizeEmail, normalizePhone, normalizeUrl, normalizeBusinessName } from '../src/core/normalize.js';

export function runNormalizeTests(assert) {
  console.log('\n--- Running Normalization Tests ---');

  // Email Normalization
  assert(normalizeEmail('  user@EXAMPLE.COM  ') === 'user@example.com', 'Trims and lowercases email');
  assert(normalizeEmail('mailto:contact@domain.org?subject=hello') === 'contact@domain.org', 'Strips mailto: and query parameters');
  assert(normalizeEmail('<sales@company.com>') === 'sales@company.com', 'Strips surrounding angle brackets');
  assert(normalizeEmail('"info@company.com"') === 'info@company.com', 'Strips surrounding quotes');
  assert(normalizeEmail('not-an-email') === '', 'Rejects malformed email string');
  assert(normalizeEmail('') === '', 'Handles empty email');

  // Phone Normalization
  assert(normalizePhone('+1 (555) 123-4567') === '+15551234567', 'Normalizes formatted US phone with country code to E.164');
  assert(normalizePhone('555-123-4567', '+1') === '+15551234567', 'Applies default prefix to 10-digit number');
  assert(normalizePhone('tel:+442079460958') === '+442079460958', 'Strips tel: prefix and keeps UK E.164');
  assert(normalizePhone('+91 98765 43210') === '+919876543210', 'Normalizes Indian country code phone');
  assert(normalizePhone('004989123456') === '+4989123456', 'Converts 00 international prefix to +');
  assert(normalizePhone('12345') === '', 'Rejects too-short phone digits (< 7)');
  assert(normalizePhone('12345678901234567890') === '', 'Rejects too-long phone digits (> 15)');

  // URL Normalization
  assert(
    normalizeUrl('https://example.com/contact?utm_source=google&utm_medium=cpc&ref=twitter', true) === 'https://example.com/contact',
    'Strips marketing tracking query parameters'
  );
  assert(
    normalizeUrl('https://example.com/about/', false) === 'https://example.com/about',
    'Normalizes trailing slashes on sub-paths'
  );

  // Business Name Normalization
  assert(normalizeBusinessName('   Acme    Corporation   ') === 'Acme Corporation', 'Collapses multiple whitespace');

  console.log('✓ Normalization tests passed');
}


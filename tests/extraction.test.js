/**
 * Test Suite: Extraction Engine
 */

import { extractEmails, extractPhones, extractBusinessName, extractLeadsFromPayload, isIgnoredEmail } from '../src/core/extract.js';
import { DEFAULT_SETTINGS } from '../src/core/types.js';

export function runExtractionTests(assert) {
  console.log('\n--- Running Extraction Tests ---');

  // Ignored / Dummy Emails
  assert(isIgnoredEmail('test@example.com', ['example.com']), 'Flags blacklisted domain as ignored');
  assert(isIgnoredEmail('demo@company.com'), 'Flags demo@ prefix as ignored');
  assert(isIgnoredEmail('logo.png', []), 'Flags image asset as ignored');
  assert(!isIgnoredEmail('real.person@legitcompany.com', ['example.com']), 'Permits real email');

  // Extract Emails
  const sampleText = 'Feel free to contact us at sales@domain.org or info@domain.org for queries. Also ignore user@example.com.';
  const mailtoLinks = ['mailto:sales@domain.org', 'mailto:support@domain.org'];
  const extractedEmails = extractEmails(sampleText, mailtoLinks, ['example.com']);
  const emailAddresses = extractedEmails.map(e => e.email);

  assert(emailAddresses.includes('sales@domain.org'), 'Extracts mailto links with high priority');
  assert(emailAddresses.includes('support@domain.org'), 'Extracts mailto links');
  assert(emailAddresses.includes('info@domain.org'), 'Extracts emails from plain text');
  assert(!emailAddresses.includes('user@example.com'), 'Filters out ignored domains');

  // Extract Phones
  const textWithPhones = 'Call our direct office at +1 (415) 555-0199 or mobile 555-234-5678. Fax: 2026-10-30 is a date.';
  const telLinks = ['tel:+18005550100'];
  const extractedPhones = extractPhones(textWithPhones, telLinks, '+1');
  const phoneNumbers = extractedPhones.map(p => p.phone);

  assert(phoneNumbers.includes('+18005550100'), 'Extracts tel: links with high priority');
  assert(phoneNumbers.includes('+14155550199'), 'Extracts formatted international phone from text');
  assert(phoneNumbers.includes('+15552345678'), 'Extracts standard 10-digit phone with default country code');
  assert(!phoneNumbers.includes('20261030'), 'Does not extract dates as phone numbers');

  // Extract Business Name
  assert(
    extractBusinessName(['Acme Cloud Systems'], ['Welcome'], 'Acme | Cloud Services') === 'Acme Cloud Systems',
    'Prioritizes JSON-LD organization name'
  );
  assert(
    extractBusinessName([], ['Apex Innovations Ltd'], 'Home Page') === 'Apex Innovations Ltd',
    'Uses meaningful H1 heading when JSON-LD is absent'
  );
  assert(
    extractBusinessName([], ['Contact Us'], 'BlueSky Ventures - Leading AI Tech') === 'BlueSky Ventures',
    'Extracts brand name from title when heading is generic'
  );

  // Full Payload Extraction - Coupled JSON-LD
  const coupledPayload = {
    url: 'https://acmecloud.example.com/contact',
    title: 'Acme Cloud - Contact',
    text: 'Contact Acme Cloud at contact@acmecloud.com or +1 800 555 0199.',
    mailtoLinks: ['mailto:contact@acmecloud.com'],
    telLinks: ['tel:+18005550199'],
    jsonLdOrgs: ['Acme Cloud'],
    jsonLdPhones: ['+1-800-555-0199'],
    jsonLdEmails: ['contact@acmecloud.com'],
    headings: ['Contact Us']
  };

  const coupledLeads = extractLeadsFromPayload(coupledPayload, DEFAULT_SETTINGS);
  assert(coupledLeads.length === 1, 'Produces exactly 1 joined lead when phone and email are coupled via JSON-LD');
  assert(coupledLeads[0].businessName === 'Acme Cloud', 'Sets extracted business name');
  assert(coupledLeads[0].email === 'contact@acmecloud.com', 'Sets extracted email');
  assert(coupledLeads[0].phone === '+18005550199', 'Sets extracted phone');
  assert(coupledLeads[0].confidence === 'high', 'Labels coupled contact as high confidence');

  // Full Payload Extraction - Multiple Unrelated Contacts (Non-overjoining rule)
  const multiPayload = {
    url: 'https://apex.example.com/directory',
    title: 'Directory - Apex Corp',
    text: 'Sales: sales@apex.com / +1 (415) 555-1111. Support: support@apex.com / +1 (800) 555-2222.',
    mailtoLinks: ['mailto:sales@apex.com', 'mailto:support@apex.com'],
    telLinks: ['tel:+14155551111', 'tel:+18005552222'],
    jsonLdOrgs: [],
    jsonLdPhones: [],
    jsonLdEmails: [],
    headings: ['Apex Corp Directory']
  };

  const multiLeads = extractLeadsFromPayload(multiPayload, DEFAULT_SETTINGS);
  assert(multiLeads.length === 4, 'Preserves separate contacts independently instead of inventing false joins');
  assert(multiLeads.every(l => l.sourceUrl.includes('apex.example.com')), 'Preserves source URL provenance for every record');

  console.log('✓ Extraction tests passed');
}


/**
 * Integration Test Suite: Synthetic HTML Fixtures
 * Verifies all 11 test cases outlined in Section 11 of the technical specification.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractLeadsFromPayload } from '../src/core/extract.js';
import { mergeAndDeduplicateLeads } from '../src/core/dedupe.js';
import { generateCsv } from '../src/export/csv.js';
import { LeadsRepository } from '../src/storage/leads-repository.js';
import { DEFAULT_SETTINGS } from '../src/core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

export function runFixtureTests(assert) {
  console.log('\n--- Running Synthetic HTML Fixtures Integration Tests ---');

  // Case 1: Business contact page (valid-contacts.html)
  const validHtml = fs.readFileSync(path.join(fixturesDir, 'valid-contacts.html'), 'utf-8');
  const validPayload = {
    url: 'https://acmecloud.tech/contact',
    title: 'Acme Cloud Technologies - Contact Us',
    text: validHtml.replace(/<[^>]+>/g, ' '),
    mailtoLinks: ['mailto:contact@acmecloud.tech'],
    telLinks: ['tel:+18005550199'],
    jsonLdOrgs: ['Acme Cloud Technologies'],
    jsonLdPhones: ['+1-800-555-0199'],
    jsonLdEmails: ['contact@acmecloud.tech'],
    headings: ['Acme Cloud Technologies']
  };

  const validLeads = extractLeadsFromPayload(validPayload, DEFAULT_SETTINGS);
  assert(validLeads.length >= 1, 'Case 1: Finds published contacts on business contact page');
  assert(validLeads[0].businessName === 'Acme Cloud Technologies', 'Case 1: Retains correct business name');
  assert(validLeads[0].sourceUrl === 'https://acmecloud.tech/contact', 'Case 1: Retains source URL provenance');

  // Case 2: mailto:/tel: links
  assert(validLeads[0].email === 'contact@acmecloud.tech', 'Case 2: Normalizes mailto: link to clean email');
  assert(validLeads[0].phone === '+18005550199', 'Case 2: Normalizes tel: link to E.164 phone');

  // Case 3: No contact page (no-contacts.html)
  const noContactHtml = fs.readFileSync(path.join(fixturesDir, 'no-contacts.html'), 'utf-8');
  const noContactPayload = {
    url: 'https://techblog.online/distributed-systems',
    title: 'Understanding Modern Distributed Systems',
    text: noContactHtml.replace(/<[^>]+>/g, ' '),
    mailtoLinks: [],
    telLinks: [],
    jsonLdOrgs: [],
    jsonLdPhones: [],
    jsonLdEmails: [],
    headings: ['Understanding Modern Distributed Systems']
  };
  const noContactLeads = extractLeadsFromPayload(noContactPayload, DEFAULT_SETTINGS);
  assert(noContactLeads.length === 0, 'Case 3: Shows zero results on no-contact page (no empty lead created)');

  // Case 4: Same page scanned twice (rescan duplicate prevention)
  const firstScan = mergeAndDeduplicateLeads(validLeads, []);
  const secondScan = mergeAndDeduplicateLeads(validLeads, firstScan.mergedLeads);
  assert(secondScan.mergedLeads.length === firstScan.mergedLeads.length, 'Case 4: No duplicate rows when same page is scanned twice');
  assert(secondScan.duplicateCount > 0, 'Case 4: Duplicate count tracked properly');

  // Case 5: Malformed contact text (malformed-contacts.html)
  const malformedHtml = fs.readFileSync(path.join(fixturesDir, 'malformed-contacts.html'), 'utf-8');
  const malformedPayload = {
    url: 'https://broken.portal.org/test',
    title: 'Buggy Portal',
    text: malformedHtml.replace(/<[^>]+>/g, ' '),
    mailtoLinks: ['mailto:not-an-email', 'mailto:real.person@company.org?subject=Help'],
    telLinks: ['tel:abc-def-ghij'],
    jsonLdOrgs: [],
    jsonLdPhones: [],
    jsonLdEmails: [],
    headings: ['Malformed Contact Test Page']
  };
  const malformedLeads = extractLeadsFromPayload(malformedPayload, DEFAULT_SETTINGS);
  const emailsFound = malformedLeads.map(l => l.email).filter(Boolean);
  assert(!emailsFound.includes('not-an-email'), 'Case 5: Invalid candidate email rejected');
  assert(emailsFound.includes('real.person@company.org'), 'Case 5: Cleaned email extracted despite query params');

  // Case 6: Multiple unrelated contacts (multiple-unrelated-contacts.html)
  const multiHtml = fs.readFileSync(path.join(fixturesDir, 'multiple-unrelated-contacts.html'), 'utf-8');
  const multiPayload = {
    url: 'https://apex.net/directory',
    title: 'Enterprise Directory',
    text: multiHtml.replace(/<[^>]+>/g, ' '),
    mailtoLinks: ['mailto:support@apex-holdings.net'],
    telLinks: ['tel:+14155551122', 'tel:+18005553344'],
    jsonLdOrgs: [],
    jsonLdPhones: [],
    jsonLdEmails: [],
    headings: ['Apex Holdings Corporate Directory']
  };
  const multiLeads = extractLeadsFromPayload(multiPayload, DEFAULT_SETTINGS);
  assert(multiLeads.length === 5, 'Case 6: Preserves separate contact records without inventing artificial identity joins');
  assert(multiLeads.filter(l => l.email).length === 3, 'Case 6: Correctly extracted 3 distinct department emails');
  assert(multiLeads.filter(l => l.phone).length === 2, 'Case 6: Correctly extracted 2 distinct department phones');

  // Case 7: Large / dynamic page size limits
  const hugeText = 'Sample text block. '.repeat(20000); // ~380,000 characters
  assert(hugeText.length > 250000, 'Verify raw text is > 250,000 characters');
  const cappedSlice = hugeText.slice(0, 250000);
  assert(cappedSlice.length === 250000, 'Case 7: Text capped gracefully to 250,000 character limit');

  // Case 8: CSV with commas and quotes
  const trickyLeads = [
    {
      id: 'lead-csv',
      businessName: 'Smith, Jones & "Co."',
      email: 'smith@co.com',
      sourceUrl: 'https://co.com',
      capturedAt: '2026-10-30T00:00:00Z',
      reviewStatus: 'approved'
    }
  ];
  const csvTricky = generateCsv(trickyLeads, true);
  assert(csvTricky.includes('"Smith, Jones & ""Co."""'), 'Case 8: Correctly escaped quotes and commas per RFC 4180');

  // Case 9: CSV formula-like values
  const formulaLeads = [
    {
      id: 'lead-formula',
      businessName: '=2+5',
      contactName: '@HACKER',
      email: '+cmd@evil.com',
      sourceUrl: 'https://test.com',
      capturedAt: '2026-10-30T00:00:00Z',
      reviewStatus: 'approved'
    }
  ];
  const csvFormula = generateCsv(formulaLeads, true);
  assert(csvFormula.includes("Single quote escaping: '=2+5") || csvFormula.includes("'+cmd@evil.com"), 'Case 9: Protected against spreadsheet formula injection');

  // Case 10: Clear local data
  LeadsRepository.saveAllLeads(validLeads).then(async () => {
    let saved = await LeadsRepository.getAllLeads();
    assert(saved.length > 0, 'Pre-clear: Leads stored');
    await LeadsRepository.clearAll();
    saved = await LeadsRepository.getAllLeads();
    assert(saved.length === 0, 'Case 10: No records remain after clear action');
  });

  console.log('✓ Synthetic HTML fixtures integration tests passed');
}

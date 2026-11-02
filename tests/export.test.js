/**
 * Test Suite: Export Engine (CSV & TXT)
 */

import { generateCsv, getCsvExportFilename, sanitizeCellValue, escapeCsvField } from '../src/export/csv.js';
import { generateTxt, getTxtExportFilename } from '../src/export/txt.js';

export function runExportTests(assert) {
  console.log('\n--- Running Export Engine Tests ---');

  // 1. Formula Injection Mitigation
  assert(sanitizeCellValue('=SUM(1+1)', true) === "'=SUM(1+1)", 'Prefixes = formula with single quote');
  assert(sanitizeCellValue('+cmd|/c calc', true) === "'+cmd|/c calc", 'Prefixes + formula with single quote');
  assert(sanitizeCellValue('-12345', true) === "'-12345", 'Prefixes - formula with single quote');
  assert(sanitizeCellValue('@HYPERLINK("http://evil.com")', true) === "'@HYPERLINK(\"http://evil.com\")", 'Prefixes @ formula with single quote');
  assert(sanitizeCellValue('Safe Business Name', true) === 'Safe Business Name', 'Leaves safe values unchanged');
  assert(sanitizeCellValue('=SUM(1+1)', false) === '=SUM(1+1)', 'Does not escape when safeFormulas is disabled');

  // 2. RFC 4180 Quoting & Escaping
  assert(escapeCsvField('Smith, John') === '"Smith, John"', 'Quotes field containing a comma');
  assert(escapeCsvField('He said "Hello"') === '"He said ""Hello"""', 'Doubles embedded double quotes');
  assert(escapeCsvField('Multi\nLine') === '"Multi\nLine"', 'Quotes multiline field');
  assert(escapeCsvField('Simple') === 'Simple', 'Does not quote plain text without special characters');

  // 3. Complete CSV Generation & UTF-8 BOM
  const sampleLeads = [
    {
      id: 'uuid-1',
      businessName: 'Acme, Inc.',
      contactName: 'Alice "Tech" Smith',
      phone: '+15551234567',
      email: 'alice@acme.com',
      website: 'https://acme.com',
      sourceUrl: 'https://acme.com/contact',
      capturedAt: '2026-10-30T10:00:00Z',
      reviewStatus: 'approved'
    },
    {
      id: 'uuid-2',
      businessName: '=EvilCorp',
      contactName: '',
      phone: '+15559876543',
      email: 'hacker@evil.com',
      website: 'https://evil.com',
      sourceUrl: 'https://evil.com',
      capturedAt: '2026-10-30T10:05:00Z',
      reviewStatus: 'pending'
    }
  ];

  const csvOutput = generateCsv(sampleLeads, true);

  assert(csvOutput.startsWith('\uFEFF'), 'Prepends UTF-8 BOM for Excel multilingual support');
  assert(csvOutput.includes('businessName,contactName,phone,email,website,sourceUrl,capturedAt,reviewStatus'), 'Includes standard CSV headers');
  assert(csvOutput.includes('"Acme, Inc."'), 'Quotes businessName containing comma');
  assert(csvOutput.includes('"Alice ""Tech"" Smith"'), 'Doubles internal quotes in contactName');
  assert(csvOutput.includes("'=EvilCorp"), 'Neutralizes formula injection in businessName');

  // 4. TXT Generation
  const txtOutput = generateTxt(sampleLeads);
  const txtLines = txtOutput.split('\n');

  assert(txtLines.length === 2, 'Generates one line per lead in TXT output');
  assert(
    txtLines[0] === 'Acme, Inc. | +15551234567 | alice@acme.com | https://acme.com/contact',
    'Formats pipe-delimited TXT line correctly'
  );

  // 5. Filenames
  const testDate = new Date(2026, 9, 27); // Month is 0-indexed: 9 -> October
  assert(getCsvExportFilename(testDate) === 'lead_capture_2026-10-27.csv', 'Matches expected CSV filename pattern');
  assert(getTxtExportFilename(testDate) === 'lead_capture_2026-10-27.txt', 'Matches expected TXT filename pattern');

  console.log('✓ Export tests passed');
}


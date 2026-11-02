/**
 * Lead Generation Extension - RFC 4180 CSV Exporter
 * Includes Formula Injection (CSV Injection) Mitigation & UTF-8 BOM encoding.
 */

export const CSV_HEADERS = [
  'businessName',
  'contactName',
  'phone',
  'email',
  'website',
  'sourceUrl',
  'capturedAt',
  'reviewStatus'
];

/**
 * Mitigates spreadsheet formula injection (CSV Injection).
 * Prefixes fields starting with =, +, -, @, \t, or \r with a single quote.
 * 
 * @param {string} value
 * @param {boolean} [safeFormulas=true]
 * @returns {string}
 */
export function sanitizeCellValue(value, safeFormulas = true) {
  if (value === null || value === undefined) return '';
  let str = String(value);

  if (safeFormulas && str.length > 0) {
    const firstChar = str.charAt(0);
    if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
      str = `'${str}`;
    }
  }

  return str;
}

/**
 * Escapes a single CSV field in accordance with RFC 4180.
 * Double quotes are doubled (" -> ""), and the field is wrapped in quotes
 * if it contains a comma, quote, or newline.
 * 
 * @param {string} value
 * @param {boolean} [safeFormulas=true]
 * @returns {string}
 */
export function escapeCsvField(value, safeFormulas = true) {
  const sanitized = sanitizeCellValue(value, safeFormulas);

  // Check if quoting is required
  const needsQuoting = /[",\r\n]/.test(sanitized);

  if (needsQuoting) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  return sanitized;
}

/**
 * Converts an array of Lead objects into a valid RFC 4180 CSV string with UTF-8 BOM.
 * 
 * @param {import('../core/types.js').Lead[]} leads
 * @param {boolean} [safeFormulas=true]
 * @returns {string}
 */
export function generateCsv(leads = [], safeFormulas = true) {
  const headerLine = CSV_HEADERS.join(',');
  const lines = [headerLine];

  for (const lead of leads) {
    const row = CSV_HEADERS.map(header => {
      const val = lead[header] ?? '';
      return escapeCsvField(val, safeFormulas);
    });
    lines.push(row.join(','));
  }

  // Prepend UTF-8 BOM so Microsoft Excel correctly recognizes UTF-8 / multilingual characters
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Generates the standardized export filename: lead_capture_YYYY-MM-DD.csv
 * 
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getCsvExportFilename(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `lead_capture_${yyyy}-${mm}-${dd}.csv`;
}


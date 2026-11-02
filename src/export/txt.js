/**
 * Lead Generation Extension - Pipe-Delimited TXT Exporter
 */

/**
 * Formats an array of Lead objects into clean pipe-delimited lines:
 * Business/Contact | Phone | Email | Source URL
 * 
 * @param {import('../core/types.js').Lead[]} leads
 * @returns {string}
 */
export function generateTxt(leads = []) {
  const lines = [];

  for (const lead of leads) {
    const name = lead.businessName || lead.contactName || 'N/A';
    const phone = lead.phone || 'N/A';
    const email = lead.email || 'N/A';
    const url = lead.sourceUrl || '';

    lines.push(`${name} | ${phone} | ${email} | ${url}`);
  }

  return lines.join('\n');
}

/**
 * Generates the standardized export filename: lead_capture_YYYY-MM-DD.txt
 * 
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getTxtExportFilename(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `lead_capture_${yyyy}-${mm}-${dd}.txt`;
}


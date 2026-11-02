/**
 * Lead Generation Extension - Content Script DOM Reader
 * Injected on-demand into the active tab upon explicit user action ("Scan Current Page").
 * Collects visible text, mailto/tel links, and JSON-LD schema metadata.
 */

export function extractPageDOM() {
  try {
    const body = document.body;
    if (!body) {
      return {
        text: '',
        mailtoLinks: [],
        telLinks: [],
        jsonLdOrgs: [],
        jsonLdPhones: [],
        jsonLdEmails: [],
        headings: [],
        title: document.title || '',
        url: location.href
      };
    }

    // 1. Visible innerText capped at 250,000 characters to prevent memory freezing
    const rawText = body.innerText || '';
    const text = rawText.slice(0, 250000);

    // 2. High-confidence contact links
    const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:" i]'))
      .map(a => a.getAttribute('href') || '')
      .filter(Boolean);

    const telLinks = Array.from(document.querySelectorAll('a[href^="tel:" i]'))
      .map(a => a.getAttribute('href') || '')
      .filter(Boolean);

    // 3. Prominent H1 headings
    const headings = Array.from(document.querySelectorAll('h1'))
      .map(h => (h.innerText || '').trim())
      .filter(Boolean);

    // 4. JSON-LD schema structured data
    const jsonLdOrgs = [];
    const jsonLdPhones = [];
    const jsonLdEmails = [];

    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const parsed = JSON.parse(script.textContent || '');
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);

        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const type = item['@type'];
          const isOrg = type === 'Organization' || type === 'LocalBusiness' ||
            (Array.isArray(type) && (type.includes('Organization') || type.includes('LocalBusiness')));

          if (isOrg || item.telephone || item.email) {
            if (item.name && typeof item.name === 'string') {
              jsonLdOrgs.push(item.name.trim());
            }
            if (item.legalName && typeof item.legalName === 'string') {
              jsonLdOrgs.push(item.legalName.trim());
            }
            if (item.telephone) {
              const tels = Array.isArray(item.telephone) ? item.telephone : [item.telephone];
              jsonLdPhones.push(...tels.filter(t => typeof t === 'string'));
            }
            if (item.email) {
              const ems = Array.isArray(item.email) ? item.email : [item.email];
              jsonLdEmails.push(...ems.filter(e => typeof e === 'string'));
            }
          }
        }
      } catch {
        // Ignore JSON-LD parse errors on malformed third-party scripts
      }
    }

    return {
      text,
      mailtoLinks,
      telLinks,
      jsonLdOrgs,
      jsonLdPhones,
      jsonLdEmails,
      headings,
      title: document.title || '',
      url: location.href
    };
  } catch (err) {
    return {
      error: err.message,
      text: '',
      mailtoLinks: [],
      telLinks: [],
      jsonLdOrgs: [],
      jsonLdPhones: [],
      jsonLdEmails: [],
      headings: [],
      title: document.title || '',
      url: location.href
    };
  }
}


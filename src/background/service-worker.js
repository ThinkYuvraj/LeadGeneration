/**
 * Lead Generation Extension - Background Service Worker (Manifest V3)
 * Handles action routing, activeTab script injection, and download orchestration.
 */

import { extractLeadsFromPayload } from '../core/extract.js';
import { mergeAndDeduplicateLeads } from '../core/dedupe.js';
import { LeadsRepository } from '../storage/leads-repository.js';
import { generateCsv, getCsvExportFilename } from '../export/csv.js';
import { generateTxt, getTxtExportFilename } from '../export/txt.js';

/**
 * Checks if a URL can be scanned.
 * Rejects browser internal pages, web store, and local files unless permitted.
 */
function isScannableUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url);
}

/**
 * Injected function that executes in the page context.
 * Self-contained so it can be passed directly to chrome.scripting.executeScript.
 */
function pageScanFunction() {
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

  const rawText = body.innerText || '';
  const text = rawText.slice(0, 250000);

  const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:" i]'))
    .map(a => a.getAttribute('href') || '')
    .filter(Boolean);

  const telLinks = Array.from(document.querySelectorAll('a[href^="tel:" i]'))
    .map(a => a.getAttribute('href') || '')
    .filter(Boolean);

  const headings = Array.from(document.querySelectorAll('h1'))
    .map(h => (h.innerText || '').trim())
    .filter(Boolean);

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
      // Ignore malformed JSON-LD
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
}

/**
 * Orchestrates page scanning on the active tab.
 */
async function handleScanCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab || !activeTab.id) {
    throw new Error('No active browser tab found.');
  }

  if (!isScannableUrl(activeTab.url)) {
    throw new Error('This page cannot be scanned. Browser internal pages and restricted schemes are not supported.');
  }

  // Inject DOM reader
  const results = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: pageScanFunction
  });

  if (!results || !results[0] || !results[0].result) {
    throw new Error('Failed to extract DOM content from the active tab.');
  }

  const payload = results[0].result;
  const settings = await LeadsRepository.getSettings();

  // Extract raw candidate leads
  const candidates = extractLeadsFromPayload(payload, settings);

  // Fetch existing leads and merge/dedupe
  const existingLeads = await LeadsRepository.getAllLeads();
  const mergeResult = mergeAndDeduplicateLeads(candidates, existingLeads);

  // Persist updated list
  await LeadsRepository.saveAllLeads(mergeResult.mergedLeads);

  const emailCount = candidates.filter(c => !!c.email).length;
  const phoneCount = candidates.filter(c => !!c.phone).length;

  return {
    success: true,
    pageTitle: payload.title || activeTab.title || 'Current Page',
    pageUrl: payload.url || activeTab.url,
    totalFound: candidates.length,
    validEmails: emailCount,
    validPhones: phoneCount,
    duplicatesIgnored: mergeResult.duplicateCount,
    addedCount: mergeResult.addedCount,
    updatedCount: mergeResult.updatedCount
  };
}

/**
 * Handles user-requested export download.
 */
async function handleExportDownload(request) {
  const { format, leads, safeFormulas } = request;
  const targetLeads = leads && leads.length > 0 ? leads : await LeadsRepository.getAllLeads();

  if (targetLeads.length === 0) {
    throw new Error('No leads available to export.');
  }

  let content = '';
  let filename = '';
  let mimeType = '';

  if (format === 'csv') {
    content = generateCsv(targetLeads, safeFormulas ?? true);
    filename = getCsvExportFilename();
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    content = generateTxt(targetLeads);
    filename = getTxtExportFilename();
    mimeType = 'text/plain;charset=utf-8;';
  }

  // Convert to Data URI for chrome.downloads.download
  const encodedContent = encodeURIComponent(content);
  const dataUrl = `data:${mimeType},${encodedContent}`;

  const downloadId = await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true
  });

  return { success: true, downloadId, count: targetLeads.length, filename };
}

// Global runtime message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_CURRENT_PAGE') {
    handleScanCurrentTab()
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // asynchronous response
  }

  if (message.type === 'EXPORT_LEADS') {
    handleExportDownload(message)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'OPEN_REVIEW_PAGE') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/review.html') });
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'OPEN_SETTINGS_PAGE') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return false;
  }
});


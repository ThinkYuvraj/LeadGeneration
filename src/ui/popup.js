/**
 * Lead Generation Extension - Popup Controller
 */

import { LeadsRepository } from '../storage/leads-repository.js';

document.addEventListener('DOMContentLoaded', async () => {
  const pageTitleEl = document.getElementById('pageTitle');
  const pageUrlEl = document.getElementById('pageUrl');
  const pageStatusEl = document.getElementById('pageStatus');
  const btnScan = document.getElementById('btnScan');
  const btnOpenReview = document.getElementById('btnOpenReview');
  const btnViewSaved = document.getElementById('btnViewSaved');
  const btnSettings = document.getElementById('btnSettings');
  const linkClearData = document.getElementById('linkClearData');
  const errorBanner = document.getElementById('errorBanner');
  const resultsCard = document.getElementById('resultsCard');

  const valTotal = document.getElementById('valTotal');
  const valEmails = document.getElementById('valEmails');
  const valPhones = document.getElementById('valPhones');
  const valDupes = document.getElementById('valDupes');

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  function clearError() {
    errorBanner.textContent = '';
    errorBanner.classList.add('hidden');
  }

  // 1. Inspect active tab and check permissions/support
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showError('Unable to detect active tab information.');
      btnScan.disabled = true;
      return;
    }

    pageTitleEl.textContent = tab.title || 'Untitled Page';
    pageUrlEl.textContent = tab.url;

    const isHttp = /^https?:\/\//i.test(tab.url);
    if (!isHttp) {
      pageStatusEl.textContent = 'Unsupported Page';
      pageStatusEl.className = 'status-badge status-restricted';
      btnScan.disabled = true;
      showError('Restricted browser page. Lead scanning is only supported on standard HTTP/HTTPS websites.');
    } else {
      pageStatusEl.textContent = 'Ready to Scan';
      pageStatusEl.className = 'status-badge status-ready';
      btnScan.disabled = false;
    }
  } catch (err) {
    showError('Error initializing tab context: ' + err.message);
  }

  // 2. Scan Current Page
  btnScan.addEventListener('click', async () => {
    clearError();
    resultsCard.classList.add('hidden');

    const originalHtml = btnScan.innerHTML;
    btnScan.disabled = true;
    btnScan.innerHTML = `<span class="spinner"></span> <span>Scanning Page...</span>`;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'SCAN_CURRENT_PAGE' });

      if (!response || !response.success) {
        showError(response?.error || 'Failed to complete scan on the active page.');
        return;
      }

      valTotal.textContent = String(response.totalFound ?? 0);
      valEmails.textContent = String(response.validEmails ?? 0);
      valPhones.textContent = String(response.validPhones ?? 0);
      valDupes.textContent = String(response.duplicatesIgnored ?? 0);

      resultsCard.classList.remove('hidden');
    } catch (err) {
      showError('Scan request failed: ' + err.message);
    } finally {
      btnScan.disabled = false;
      btnScan.innerHTML = originalHtml;
    }
  });

  // 3. Navigation Actions
  btnOpenReview.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_REVIEW_PAGE' });
  });

  btnViewSaved.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_REVIEW_PAGE' });
  });

  btnSettings.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS_PAGE' });
  });

  // 4. Quick Clear Action
  linkClearData.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all locally stored leads? This cannot be undone.')) {
      await LeadsRepository.clearAll();
      resultsCard.classList.add('hidden');
      alert('All local leads have been cleared.');
    }
  });
});


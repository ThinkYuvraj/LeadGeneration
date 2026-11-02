/**
 * Lead Generation Extension - Options Controller
 */

import { LeadsRepository } from '../storage/leads-repository.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settingsForm');
  const defaultCountryCode = document.getElementById('defaultCountryCode');
  const stripTrackingParams = document.getElementById('stripTrackingParams');
  const exportSafeFormulas = document.getElementById('exportSafeFormulas');
  const ignoreDomains = document.getElementById('ignoreDomains');
  const btnOptionsClearData = document.getElementById('btnOptionsClearData');
  const toastEl = document.getElementById('toast');

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  // Load existing settings
  const settings = await LeadsRepository.getSettings();
  defaultCountryCode.value = settings.defaultCountryCode || '+1';
  stripTrackingParams.checked = settings.stripTrackingParams ?? true;
  exportSafeFormulas.checked = settings.exportSafeFormulas ?? true;
  ignoreDomains.value = (settings.ignoreDomains || []).join(', ');

  // Save Settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const domainList = ignoreDomains.value
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);

    let prefix = defaultCountryCode.value.trim();
    if (prefix && !prefix.startsWith('+')) {
      prefix = `+${prefix}`;
    }

    await LeadsRepository.saveSettings({
      defaultCountryCode: prefix || '+1',
      stripTrackingParams: stripTrackingParams.checked,
      exportSafeFormulas: exportSafeFormulas.checked,
      ignoreDomains: domainList
    });

    showToast('Settings saved successfully!');
  });

  // Clear All Stored Data
  btnOptionsClearData.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete ALL captured leads? This cannot be undone.')) {
      await LeadsRepository.clearAll();
      showToast('All local leads have been deleted.');
    }
  });
});


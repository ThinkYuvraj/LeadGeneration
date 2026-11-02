/**
 * Lead Generation Extension - Review Manager Controller
 */

import { LeadsRepository } from '../storage/leads-repository.js';
import { generateCsv, getCsvExportFilename } from '../export/csv.js';
import { generateTxt, getTxtExportFilename } from '../export/txt.js';

let allLeads = [];
const selectedIds = new Set();

// Elements
const leadsTableBody = document.getElementById('leadsTableBody');
const emptyState = document.getElementById('emptyState');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectedCountLabel = document.getElementById('selectedCountLabel');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const confidenceFilter = document.getElementById('confidenceFilter');
const exportScope = document.getElementById('exportScope');

const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statApproved = document.getElementById('statApproved');
const statRejected = document.getElementById('statRejected');

const btnBulkApprove = document.getElementById('btnBulkApprove');
const btnBulkReject = document.getElementById('btnBulkReject');
const btnBulkDelete = document.getElementById('btnBulkDelete');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnExportTxt = document.getElementById('btnExportTxt');
const btnClearAll = document.getElementById('btnClearAll');
const btnOptions = document.getElementById('btnOptions');
const toastEl = document.getElementById('toast');

function showToast(message, duration = 3000) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

function updateStats() {
  statTotal.textContent = String(allLeads.length);
  statPending.textContent = String(allLeads.filter(l => l.reviewStatus === 'pending').length);
  statApproved.textContent = String(allLeads.filter(l => l.reviewStatus === 'approved').length);
  statRejected.textContent = String(allLeads.filter(l => l.reviewStatus === 'rejected').length);
}

function updateSelectedCount() {
  selectedCountLabel.textContent = `${selectedIds.size} selected`;
  const hasSelected = selectedIds.size > 0;
  btnBulkApprove.disabled = !hasSelected;
  btnBulkReject.disabled = !hasSelected;
  btnBulkDelete.disabled = !hasSelected;
}

function getFilteredLeads() {
  const query = (searchInput.value || '').toLowerCase().trim();
  const status = statusFilter.value;
  const conf = confidenceFilter.value;

  return allLeads.filter(lead => {
    // Status filter
    if (status !== 'all' && lead.reviewStatus !== status) return false;

    // Confidence filter
    if (conf !== 'all' && lead.confidence !== conf) return false;

    // Search query
    if (query) {
      const bName = (lead.businessName || '').toLowerCase();
      const cName = (lead.contactName || '').toLowerCase();
      const email = (lead.email || '').toLowerCase();
      const phone = (lead.phone || '').toLowerCase();
      const url = (lead.sourceUrl || '').toLowerCase();

      return bName.includes(query) || cName.includes(query) || email.includes(query) || phone.includes(query) || url.includes(query);
    }

    return true;
  });
}

function renderTable() {
  const filtered = getFilteredLeads();
  leadsTableBody.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    selectAllCheckbox.checked = false;
    selectAllCheckbox.disabled = true;
    updateSelectedCount();
    return;
  }

  emptyState.style.display = 'none';
  selectAllCheckbox.disabled = false;
  selectAllCheckbox.checked = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id));

  for (const lead of filtered) {
    const tr = document.createElement('tr');

    // 1. Checkbox
    const tdCheck = document.createElement('td');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = selectedIds.has(lead.id);
    chk.addEventListener('change', () => {
      if (chk.checked) {
        selectedIds.add(lead.id);
      } else {
        selectedIds.delete(lead.id);
      }
      updateSelectedCount();
      selectAllCheckbox.checked = filtered.every(l => selectedIds.has(l.id));
    });
    tdCheck.appendChild(chk);
    tr.appendChild(tdCheck);

    // 2. Business Name (Editable)
    const tdBusiness = document.createElement('td');
    tdBusiness.className = 'editable-cell';
    tdBusiness.contentEditable = 'true';
    tdBusiness.textContent = lead.businessName || '';
    tdBusiness.addEventListener('blur', async () => {
      const newVal = tdBusiness.textContent.trim();
      if (newVal !== (lead.businessName || '')) {
        lead.businessName = newVal;
        await LeadsRepository.updateLead(lead.id, { businessName: newVal });
      }
    });
    tr.appendChild(tdBusiness);

    // 3. Contact Name (Editable)
    const tdContact = document.createElement('td');
    tdContact.className = 'editable-cell';
    tdContact.contentEditable = 'true';
    tdContact.textContent = lead.contactName || '';
    tdContact.addEventListener('blur', async () => {
      const newVal = tdContact.textContent.trim();
      if (newVal !== (lead.contactName || '')) {
        lead.contactName = newVal;
        await LeadsRepository.updateLead(lead.id, { contactName: newVal });
      }
    });
    tr.appendChild(tdContact);

    // 4. Phone (Editable + Call link)
    const tdPhone = document.createElement('td');
    tdPhone.className = 'editable-cell';
    tdPhone.contentEditable = 'true';
    tdPhone.textContent = lead.phone || '';
    tdPhone.addEventListener('blur', async () => {
      const newVal = tdPhone.textContent.trim();
      if (newVal !== (lead.phone || '')) {
        lead.phone = newVal;
        await LeadsRepository.updateLead(lead.id, { phone: newVal });
      }
    });
    tr.appendChild(tdPhone);

    // 5. Email (Editable + Mailto)
    const tdEmail = document.createElement('td');
    tdEmail.className = 'editable-cell';
    tdEmail.contentEditable = 'true';
    tdEmail.textContent = lead.email || '';
    tdEmail.addEventListener('blur', async () => {
      const newVal = tdEmail.textContent.trim();
      if (newVal !== (lead.email || '')) {
        lead.email = newVal;
        await LeadsRepository.updateLead(lead.id, { email: newVal });
      }
    });
    tr.appendChild(tdEmail);

    // 6. Confidence Badge
    const tdConf = document.createElement('td');
    const badgeConf = document.createElement('span');
    badgeConf.className = `badge badge-${lead.confidence || 'medium'}`;
    badgeConf.textContent = lead.confidence || 'medium';
    tdConf.appendChild(badgeConf);
    tr.appendChild(tdConf);

    // 7. Status Selector
    const tdStatus = document.createElement('td');
    const selectStatus = document.createElement('select');
    selectStatus.className = 'status-select';
    ['pending', 'approved', 'rejected'].forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      if (lead.reviewStatus === s) opt.selected = true;
      selectStatus.appendChild(opt);
    });
    selectStatus.addEventListener('change', async () => {
      lead.reviewStatus = selectStatus.value;
      await LeadsRepository.updateLead(lead.id, { reviewStatus: lead.reviewStatus });
      updateStats();
    });
    tdStatus.appendChild(selectStatus);
    tr.appendChild(tdStatus);

    // 8. Source Page Link
    const tdSource = document.createElement('td');
    tdSource.className = 'link-col';
    if (lead.sourceUrl) {
      const a = document.createElement('a');
      a.href = lead.sourceUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = lead.sourceTitle || lead.sourceUrl;
      a.title = lead.sourceUrl;
      tdSource.appendChild(a);
    }
    tr.appendChild(tdSource);

    // 9. Captured At
    const tdDate = document.createElement('td');
    tdDate.style.fontSize = '11px';
    tdDate.style.color = 'var(--text-muted)';
    tdDate.textContent = lead.capturedAt ? new Date(lead.capturedAt).toLocaleDateString() : '';
    tr.appendChild(tdDate);

    // 10. Delete Action
    const tdAction = document.createElement('td');
    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-danger';
    btnDel.style.padding = '4px 8px';
    btnDel.style.fontSize = '11px';
    btnDel.textContent = '✕';
    btnDel.title = 'Delete Lead';
    btnDel.addEventListener('click', async () => {
      if (confirm('Delete this lead?')) {
        await LeadsRepository.deleteLead(lead.id);
        allLeads = allLeads.filter(l => l.id !== lead.id);
        selectedIds.delete(lead.id);
        updateStats();
        renderTable();
        showToast('Lead deleted');
      }
    });
    tdAction.appendChild(btnDel);
    tr.appendChild(tdAction);

    leadsTableBody.appendChild(tr);
  }

  updateSelectedCount();
}

// Bulk Actions
selectAllCheckbox.addEventListener('change', () => {
  const filtered = getFilteredLeads();
  if (selectAllCheckbox.checked) {
    filtered.forEach(l => selectedIds.add(l.id));
  } else {
    filtered.forEach(l => selectedIds.delete(l.id));
  }
  renderTable();
});

btnBulkApprove.addEventListener('click', async () => {
  for (const id of selectedIds) {
    const lead = allLeads.find(l => l.id === id);
    if (lead) {
      lead.reviewStatus = 'approved';
      await LeadsRepository.updateLead(id, { reviewStatus: 'approved' });
    }
  }
  updateStats();
  renderTable();
  showToast(`Approved ${selectedIds.size} leads`);
});

btnBulkReject.addEventListener('click', async () => {
  for (const id of selectedIds) {
    const lead = allLeads.find(l => l.id === id);
    if (lead) {
      lead.reviewStatus = 'rejected';
      await LeadsRepository.updateLead(id, { reviewStatus: 'rejected' });
    }
  }
  updateStats();
  renderTable();
  showToast(`Rejected ${selectedIds.size} leads`);
});

btnBulkDelete.addEventListener('click', async () => {
  if (confirm(`Permanently delete ${selectedIds.size} selected leads?`)) {
    const ids = Array.from(selectedIds);
    await LeadsRepository.deleteLeads(ids);
    allLeads = allLeads.filter(l => !selectedIds.has(l.id));
    selectedIds.clear();
    updateStats();
    renderTable();
    showToast(`Deleted ${ids.length} leads`);
  }
});

// Download helper using standard browser anchor download
function triggerBrowserDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export Handlers
async function executeExport(format) {
  let targetLeads = [];
  if (exportScope.value === 'selected') {
    targetLeads = allLeads.filter(l => selectedIds.has(l.id));
  } else {
    targetLeads = getFilteredLeads();
  }

  if (targetLeads.length === 0) {
    alert('No leads match the export selection criteria.');
    return;
  }

  const settings = await LeadsRepository.getSettings();

  if (format === 'csv') {
    const csvContent = generateCsv(targetLeads, settings.exportSafeFormulas ?? true);
    const filename = getCsvExportFilename();
    triggerBrowserDownload(csvContent, filename, 'text/csv;charset=utf-8;');
    showToast(`Exported ${targetLeads.length} leads to ${filename}`);
  } else {
    const txtContent = generateTxt(targetLeads);
    const filename = getTxtExportFilename();
    triggerBrowserDownload(txtContent, filename, 'text/plain;charset=utf-8;');
    showToast(`Exported ${targetLeads.length} leads to ${filename}`);
  }
}

btnExportCsv.addEventListener('click', () => executeExport('csv'));
btnExportTxt.addEventListener('click', () => executeExport('txt'));

btnClearAll.addEventListener('click', async () => {
  if (confirm('Are you sure you want to delete ALL captured leads? This cannot be undone.')) {
    await LeadsRepository.clearAll();
    allLeads = [];
    selectedIds.clear();
    updateStats();
    renderTable();
    showToast('All leads have been permanently cleared.');
  }
});

btnOptions.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Filters
searchInput.addEventListener('input', () => renderTable());
statusFilter.addEventListener('change', () => renderTable());
confidenceFilter.addEventListener('change', () => renderTable());

// Initial Load
async function init() {
  allLeads = await LeadsRepository.getAllLeads();
  updateStats();
  renderTable();
}

init();


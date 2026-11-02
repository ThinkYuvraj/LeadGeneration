/**
 * Lead Generation Extension - Deduplication & Merge Engine
 */

/**
 * Builds candidate keys for lead deduplication.
 * 
 * @param {import('./types.js').Lead} lead
 * @returns {{ primaryKey: string, sourceKey: string }}
 */
export function getLeadKeys(lead) {
  let primaryKey = '';
  if (lead.phone) {
    primaryKey = `phone:${lead.phone.toLowerCase()}`;
  } else if (lead.email) {
    primaryKey = `email:${lead.email.toLowerCase()}`;
  } else {
    primaryKey = `id:${lead.id}`;
  }

  const cleanUrl = lead.sourceUrl ? lead.sourceUrl.toLowerCase() : '';
  const sourceKey = `${primaryKey}@${cleanUrl}`;

  return { primaryKey, sourceKey };
}

/**
 * Merges newly scanned leads with existing repository records.
 * Rules:
 * - Do not overwrite user-reviewed records (approved/rejected or edited).
 * - Avoid duplicate rows when the same page is scanned multiple times.
 * - Enrich existing pending records if new fields (e.g., missing phone or businessName) are found.
 * 
 * @param {import('./types.js').Lead[]} newLeads - Freshly extracted leads
 * @param {import('./types.js').Lead[]} existingLeads - Stored leads
 * @returns {{ 
 *   mergedLeads: import('./types.js').Lead[], 
 *   addedCount: number, 
 *   updatedCount: number, 
 *   duplicateCount: number 
 * }}
 */
export function mergeAndDeduplicateLeads(newLeads = [], existingLeads = []) {
  const mergedMap = new Map();
  // Map sourceUrl+phone -> leadId and sourceUrl+email -> leadId
  const sourceContactMap = new Map();
  const globalPhoneMap = new Map();
  const globalEmailMap = new Map();

  function registerLead(lead) {
    mergedMap.set(lead.id, lead);
    const cleanUrl = (lead.sourceUrl || '').toLowerCase();

    if (lead.phone) {
      const pKey = lead.phone.toLowerCase();
      sourceContactMap.set(`${cleanUrl}|phone:${pKey}`, lead.id);
      if (!globalPhoneMap.has(pKey)) globalPhoneMap.set(pKey, lead.id);
    }
    if (lead.email) {
      const eKey = lead.email.toLowerCase();
      sourceContactMap.set(`${cleanUrl}|email:${eKey}`, lead.id);
      if (!globalEmailMap.has(eKey)) globalEmailMap.set(eKey, lead.id);
    }
  }

  // 1. Index existing leads
  for (const existing of existingLeads) {
    registerLead({ ...existing });
  }

  let addedCount = 0;
  let updatedCount = 0;
  let duplicateCount = 0;

  // 2. Process each new candidate lead
  for (const candidate of newLeads) {
    const cleanUrl = (candidate.sourceUrl || '').toLowerCase();
    const phoneKey = candidate.phone ? candidate.phone.toLowerCase() : null;
    const emailKey = candidate.email ? candidate.email.toLowerCase() : null;

    let matchingId = null;

    // A. Check exact contact match on same source URL (phone first, then email)
    if (phoneKey && sourceContactMap.has(`${cleanUrl}|phone:${phoneKey}`)) {
      matchingId = sourceContactMap.get(`${cleanUrl}|phone:${phoneKey}`);
    } else if (emailKey && sourceContactMap.has(`${cleanUrl}|email:${emailKey}`)) {
      matchingId = sourceContactMap.get(`${cleanUrl}|email:${emailKey}`);
    }

    if (matchingId) {
      const existing = mergedMap.get(matchingId);

      // If existing lead was already reviewed (approved/rejected), never overwrite
      if (existing.reviewStatus !== 'pending') {
        duplicateCount++;
        continue;
      }

      // If pending, enrich missing fields
      let modified = false;
      if (!existing.phone && candidate.phone) {
        existing.phone = candidate.phone;
        modified = true;
      }
      if (!existing.email && candidate.email) {
        existing.email = candidate.email;
        modified = true;
      }
      if (!existing.businessName && candidate.businessName) {
        existing.businessName = candidate.businessName;
        modified = true;
      }

      if (modified) {
        // Re-register to update maps
        registerLead(existing);
        updatedCount++;
      } else {
        duplicateCount++;
      }
      continue;
    }

    // B. Check cross-page exact match (both phone & email identical across different pages)
    if (phoneKey && globalPhoneMap.has(phoneKey)) {
      const existing = mergedMap.get(globalPhoneMap.get(phoneKey));
      if (emailKey && existing.email && existing.email.toLowerCase() === emailKey) {
        duplicateCount++;
        continue;
      }
    }

    // C. New unique lead
    registerLead(candidate);
    addedCount++;
  }

  return {
    mergedLeads: Array.from(mergedMap.values()),
    addedCount,
    updatedCount,
    duplicateCount
  };
}

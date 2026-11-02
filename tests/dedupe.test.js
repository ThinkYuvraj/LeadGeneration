/**
 * Test Suite: Deduplication & Merge Engine
 */

import { mergeAndDeduplicateLeads, getLeadKeys } from '../src/core/dedupe.js';

export function runDedupeTests(assert) {
  console.log('\n--- Running Deduplication & Merge Tests ---');

  // Candidate Keys
  const lead1 = { id: 'uuid-1', phone: '+15551234567', email: 'test@domain.com', sourceUrl: 'https://example.com' };
  const keys1 = getLeadKeys(lead1);
  assert(keys1.primaryKey === 'phone:+15551234567', 'Uses phone as primary candidate key when present');
  assert(keys1.sourceKey === 'phone:+15551234567@https://example.com', 'Builds source-scoped provenance key');

  const lead2 = { id: 'uuid-2', email: 'test@domain.com', sourceUrl: 'https://example.com' };
  const keys2 = getLeadKeys(lead2);
  assert(keys2.primaryKey === 'email:test@domain.com', 'Falls back to email when phone is missing');

  // Same page scanned twice (Rescan duplicate prevention)
  const initialLeads = [
    {
      id: 'lead-1',
      businessName: 'Original Corp',
      email: 'info@original.com',
      phone: '+15550001111',
      sourceUrl: 'https://original.com/contact',
      reviewStatus: 'pending'
    }
  ];

  const rescanCandidate = {
    id: 'lead-2',
    businessName: 'Original Corp',
    email: 'info@original.com',
    phone: '+15550001111',
    sourceUrl: 'https://original.com/contact',
    reviewStatus: 'pending'
  };

  const rescanResult = mergeAndDeduplicateLeads([rescanCandidate], initialLeads);
  assert(rescanResult.mergedLeads.length === 1, 'Does not duplicate lead when scanned twice on the same page');
  assert(rescanResult.duplicateCount === 1, 'Correctly reports duplicate count');
  assert(rescanResult.addedCount === 0, 'No leads added on redundant scan');

  // Preservation of user-reviewed state
  const approvedLead = {
    id: 'lead-approved',
    businessName: 'Reviewed Firm',
    contactName: 'Jane Doe (Curated)',
    email: 'jane@firm.com',
    sourceUrl: 'https://firm.com',
    reviewStatus: 'approved'
  };

  const rawCandidate = {
    id: 'lead-raw',
    businessName: 'Uncleaned Name',
    contactName: '',
    email: 'jane@firm.com',
    sourceUrl: 'https://firm.com',
    reviewStatus: 'pending'
  };

  const reviewPreserveResult = mergeAndDeduplicateLeads([rawCandidate], [approvedLead]);
  assert(reviewPreserveResult.mergedLeads.length === 1, 'Keeps single record');
  assert(reviewPreserveResult.mergedLeads[0].reviewStatus === 'approved', 'Preserves approved review status');
  assert(reviewPreserveResult.mergedLeads[0].contactName === 'Jane Doe (Curated)', 'Preserves user-edited fields');

  // Enriching missing fields on pending leads
  const incompleteLead = {
    id: 'lead-inc',
    email: 'contact@firm.com',
    sourceUrl: 'https://firm.com',
    reviewStatus: 'pending'
  };

  const enrichCandidate = {
    id: 'lead-enrich',
    businessName: 'Enriched Firm Name',
    phone: '+15559998888',
    email: 'contact@firm.com',
    sourceUrl: 'https://firm.com',
    reviewStatus: 'pending'
  };

  const enrichResult = mergeAndDeduplicateLeads([enrichCandidate], [incompleteLead]);
  assert(enrichResult.mergedLeads[0].phone === '+15559998888', 'Enriches missing phone on pending lead');
  assert(enrichResult.mergedLeads[0].businessName === 'Enriched Firm Name', 'Enriches missing business name on pending lead');
  assert(enrichResult.updatedCount === 1, 'Reports 1 updated lead');

  console.log('✓ Deduplication & merge tests passed');
}


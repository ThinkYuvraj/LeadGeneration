/**
 * Lead Generation Extension - Local Storage Repository
 * Wraps chrome.storage.local with schema versioning and clean async CRUD methods.
 * Provides in-memory fallback for testing in non-browser/Node.js environments.
 */

import { DEFAULT_SETTINGS } from '../core/types.js';

// In-memory fallback store for Node.js test runs
const memoryStore = {
  leads: [],
  settings: { ...DEFAULT_SETTINGS },
  schemaVersion: 1
};

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

export const LeadsRepository = {
  /**
   * Retrieves all stored leads.
   * @returns {Promise<import('../core/types.js').Lead[]>}
   */
  async getAllLeads() {
    if (hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['leads'], (result) => {
          resolve(result.leads || []);
        });
      });
    }
    return Promise.resolve([...memoryStore.leads]);
  },

  /**
   * Replaces all leads in storage.
   * @param {import('../core/types.js').Lead[]} leads
   * @returns {Promise<void>}
   */
  async saveAllLeads(leads) {
    if (hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ leads }, () => resolve());
      });
    }
    memoryStore.leads = [...leads];
    return Promise.resolve();
  },

  /**
   * Updates an existing lead by ID with partial fields.
   * @param {string} id
   * @param {Partial<import('../core/types.js').Lead>} updates
   * @returns {Promise<import('../core/types.js').Lead | null>}
   */
  async updateLead(id, updates) {
    const leads = await this.getAllLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) return null;

    leads[index] = { ...leads[index], ...updates };
    await this.saveAllLeads(leads);
    return leads[index];
  },

  /**
   * Deletes a lead by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteLead(id) {
    return this.deleteLeads([id]);
  },

  /**
   * Deletes multiple leads by ID.
   * @param {string[]} ids
   * @returns {Promise<boolean>}
   */
  async deleteLeads(ids) {
    const idSet = new Set(ids);
    const leads = await this.getAllLeads();
    const filtered = leads.filter(l => !idSet.has(l.id));
    await this.saveAllLeads(filtered);
    return true;
  },

  /**
   * Clears all stored leads (Clear All Data action).
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(['leads'], () => resolve());
      });
    }
    memoryStore.leads = [];
    return Promise.resolve();
  },

  /**
   * Retrieves extension settings with defaults.
   * @returns {Promise<import('../core/types.js').ExtensionSettings>}
   */
  async getSettings() {
    if (hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
          resolve({ ...DEFAULT_SETTINGS, ...(result.settings || {}) });
        });
      });
    }
    return Promise.resolve({ ...DEFAULT_SETTINGS, ...memoryStore.settings });
  },

  /**
   * Saves updated extension settings.
   * @param {Partial<import('../core/types.js').ExtensionSettings>} newSettings
   * @returns {Promise<import('../core/types.js').ExtensionSettings>}
   */
  async saveSettings(newSettings) {
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    if (hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ settings: updated }, () => resolve(updated));
      });
    }
    memoryStore.settings = { ...updated };
    return Promise.resolve(updated);
  }
};


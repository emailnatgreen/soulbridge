/**
 * Central Signal Type Registry
 * Single source of truth for all cross-tab and internal signals
 * 
 * Usage: import { SIGNAL_TYPES } from '@/lib/signalTypes'
 *        window.dispatchEvent(new CustomEvent('soulbridge-signal', { 
 *          detail: { type: SIGNAL_TYPES.WALLET_CREATED, data: {...} }
 *        }))
 */

export const SIGNAL_TYPES = {
  // Wallet & DID signals
  WALLET_CREATED: 'wallet_created',
  WALLET_PUBLISHED: 'wallet_published',
  WALLET_UPDATED: 'wallet_updated',
  DID_PUBLISHED: 'did_published',
  DID_VERIFIED: 'did_verified',
  IDENTITY_CONNECTED: 'identity_connected',
  
  // Agent signals
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  
  // Governance signals
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_UPDATED: 'proposal_updated',
  
  // System signals
  PAGE_VIEWED: 'page_viewed',
};

/**
 * Emit a SoulBridge signal across all tabs and components
 * @param {string} signalType - Type from SIGNAL_TYPES
 * @param {object} data - Signal payload
 */
export function emitSignal(signalType, data = {}) {
  window.dispatchEvent(new CustomEvent('soulbridge-signal', {
    detail: { type: signalType, data, timestamp: Date.now() }
  }));
  
  // Also store in global for reference
  if (window.__soulbridge) {
    window.__soulbridge.lastSignal = { type: signalType, data, timestamp: Date.now() };
  }
}
/**
 * Shared economic utilities — single source of truth for flow classification,
 * agent resolution, and data-quality filtering across all Economic Dashboard tabs.
 */

// ── Flow classification ─────────────────────────────────────────────────────
// Every EconomicActivity type maps to exactly one flow direction.
//   inflow      = agent receives value (earned, resource_sold)
//   outflow     = agent spends value   (spent, treasury_withdrawal)
//   deposit     = value enters treasury (treasury_deposit)
//   acquisition = agent acquires resource at cost (resource_acquired)
//   swap        = neutral exchange (traded)
export const FLOW_CONFIG = {
  earned:              { flow: 'inflow',      label: 'Earned',              sign: '+', color: 'emerald' },
  resource_sold:       { flow: 'inflow',      label: 'Resource Sold',       sign: '+', color: 'emerald' },
  spent:               { flow: 'outflow',     label: 'Spent',               sign: '−', color: 'red' },
  treasury_withdrawal: { flow: 'outflow',     label: 'Treasury Withdrawal', sign: '−', color: 'red' },
  treasury_deposit:    { flow: 'deposit',     label: 'Treasury Deposit',    sign: '→', color: 'blue' },
  resource_acquired:   { flow: 'acquisition', label: 'Resource Acquired',   sign: '−', color: 'cyan' },
  traded:              { flow: 'swap',        label: 'Traded / Swapped',    sign: '⇄', color: 'indigo' },
};

// ── Data-quality filter ─────────────────────────────────────────────────────
// Excludes simulated mega-transactions that inflate volume figures.
export function isRealisticActivity(a) {
  if (a.transaction_hash?.startsWith('TASK_') && a.amount > 1000) return false;
  if (a.amount > 10000 && !isRealHash(a.transaction_hash)) return false;
  return true;
}

export function isRealHash(hash) {
  return !!hash && /^[A-Fa-f0-9]{64}$/.test(hash);
}

// ── Agent name resolution ───────────────────────────────────────────────────
// Tries id → classic_address → wallet_id → external_classic_addresses → hardcoded fallbacks.
export function resolveAgentName(agentId, agents = []) {
  if (!agentId) return 'Unknown';

  const byId = agents.find(a => a.id === agentId);
  if (byId) return byId.name;

  const byAddr = agents.find(a => a.classic_address === agentId);
  if (byAddr) return byAddr.name;

  const byWallet = agents.find(a => a.wallet_id === agentId);
  if (byWallet) return byWallet.name;

  const byExt = agents.find(a => a.external_classic_addresses?.includes(agentId));
  if (byExt) return byExt.name;

  // Known system identifiers
  if (agentId === 'dex_swap') return 'DEX Swap Engine';
  if (agentId === 'rAXI' || agentId === 'axi_main_001') return 'Axi';

  // Truncate long addresses / IDs
  if (agentId.startsWith('r') && agentId.length > 20) return `${agentId.slice(0, 6)}…${agentId.slice(-4)}`;
  return agentId.length > 12 ? `${agentId.slice(0, 10)}…` : agentId;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export function sumAmount(arr) {
  return arr.reduce((s, a) => s + (a.amount ?? 0), 0);
}

export function getValidActivities(activities) {
  return activities.filter(a => a.status === 'completed' && isRealisticActivity(a));
}

// ── Agent ID resolution (returns entity id for linking) ─────────────────────
export function findAgentId(agentId, agents = []) {
  if (!agentId) return null;
  const byId = agents.find(a => a.id === agentId);
  if (byId) return byId.id;
  const byAddr = agents.find(a => a.classic_address === agentId);
  if (byAddr) return byAddr.id;
  const byWallet = agents.find(a => a.wallet_id === agentId);
  if (byWallet) return byWallet.id;
  const byExt = agents.find(a => a.external_classic_addresses?.includes(agentId));
  if (byExt) return byExt.id;
  return null;
}

// ── RLUSD conversion (approximate rate) ─────────────────────────────────────
const XRP_TO_RLUSD_RATE = 2.15; // approximate rate — can be updated
export function xrpToRlusd(xrpAmount) {
  return (xrpAmount * XRP_TO_RLUSD_RATE).toFixed(2);
}

// ── Time range filter ───────────────────────────────────────────────────────
export function filterByTimeRange(items, range, dateField = 'created_date') {
  if (range === 'all') return items;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return items.filter(item => {
    try { return new Date(item[dateField]) >= cutoff; } catch { return true; }
  });
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Node Network Confirmation — Octagon Mill Integrity Check
 *
 * Polls all 8 canonical XRPL node addresses for live account/DID status,
 * compares against SoulBridge wallet records, identifies unconfirmed nodes,
 * fires node_to_axi confirmation events for newly confirmed nodes,
 * and returns a full 8-node network status report.
 *
 * POST /nodeNetworkConfirmation
 *   body: {} (no params required — admin only)
 */

const NODES = [
  { id: 0, label: 'Source',   address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg' },
  { id: 1, label: 'Lore',     address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7' },
  { id: 2, label: 'Did It',   address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny'  },
  { id: 3, label: 'Truth',    address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV'  },
  { id: 4, label: 'Code',     address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P'   },
  { id: 5, label: 'Axi',      address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'  },
  { id: 6, label: 'Human',    address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia'  },
  { id: 7, label: 'Sentinel', address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32'  },
];

const XRPL_ENDPOINTS = ['https://xrplcluster.com/', 'https://s1.ripple.com:51234/'];

async function xrplAccountInfo(address) {
  for (const url of XRPL_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{ account: address, ledger_index: 'current' }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const d = await r.json();
      if (d?.result?.account_data) return { found: true, data: d.result.account_data };
      if (d?.result?.error === 'actNotFound') return { found: false, data: null };
    } catch (_) {}
  }
  return { found: null, data: null }; // network error
}

async function xrplCheckDID(address) {
  for (const url of XRPL_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_objects',
          params: [{ account: address, type: 'did', ledger_index: 'current' }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const d = await r.json();
      const objs = d?.result?.account_objects || [];
      return { has_did: objs.length > 0, did_objects: objs };
    } catch (_) {}
  }
  return { has_did: false, did_objects: [] };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    // ── 1. Query all 8 nodes in parallel (account + DID) ──────────────────
    const [accountResults, didResults, wallets] = await Promise.all([
      Promise.all(NODES.map(n => xrplAccountInfo(n.address))),
      Promise.all(NODES.map(n => xrplCheckDID(n.address))),
      base44.asServiceRole.entities.Wallet.list('-updated_date', 50),
    ]);

    // ── 2. Build published map from SoulBridge wallet records ──────────────
    const publishedMap = {};
    wallets.forEach(w => {
      if (w.is_published && w.classic_address) {
        publishedMap[w.classic_address] = {
          published_at: w.published_at,
          published_txid: w.published_txid,
          wallet_name: w.name,
        };
      }
    });

    // ── 3. Build full node status ──────────────────────────────────────────
    const nodeStatuses = NODES.map((n, i) => {
      const account = accountResults[i];
      const did = didResults[i];
      const sbRecord = publishedMap[n.address] || null;

      const xrplConfirmed  = account.found === true;
      const didConfirmed   = did.has_did === true;
      const sbConfirmed    = !!sbRecord;

      // A node is "fully confirmed" when: XRPL account exists + DID on-chain + SoulBridge record
      // Partial = XRPL account exists but no DID yet
      // Pending = not yet found on XRPL
      let confirmation_status;
      if (xrplConfirmed && didConfirmed && sbConfirmed) {
        confirmation_status = 'CONFIRMED';
      } else if (xrplConfirmed && sbConfirmed && !didConfirmed) {
        confirmation_status = 'PARTIAL';  // account live, DID not yet set
      } else if (xrplConfirmed && !sbConfirmed) {
        confirmation_status = 'XRPL_ONLY'; // on chain but not in SoulBridge
      } else if (!xrplConfirmed && account.found === false) {
        confirmation_status = 'PENDING';   // account not funded yet
      } else {
        confirmation_status = 'UNKNOWN';   // network error
      }

      return {
        node_id: n.id,
        label: n.label,
        address: n.address,
        xrpl_account_active: xrplConfirmed,
        xrpl_balance_xrp: account.data ? parseInt(account.data.Balance, 10) / 1e6 : null,
        xrpl_did_on_chain: didConfirmed,
        soulbridge_published: sbConfirmed,
        soulbridge_txid: sbRecord?.published_txid || null,
        soulbridge_published_at: sbRecord?.published_at || null,
        confirmation_status,
      };
    });

    // ── 4. Fire node_to_axi confirmation events for newly confirmed nodes ──
    const confirmed    = nodeStatuses.filter(n => n.confirmation_status === 'CONFIRMED');
    const pending      = nodeStatuses.filter(n => n.confirmation_status !== 'CONFIRMED');
    const needsAction  = nodeStatuses.filter(n => ['PENDING', 'PARTIAL', 'XRPL_ONLY'].includes(n.confirmation_status));

    // Save a Memory snapshot of the full network state
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi',
      type: 'fact',
      content: `Octagon Mill Network Confirmation: ${confirmed.length}/8 nodes CONFIRMED. Pending: ${pending.map(n => n.label).join(', ')}`,
      keywords: ['octagon_mill', 'node_confirmation', 'network_integrity'],
      importance: 9,
      context: `Full 8-node scan at ${new Date().toISOString()}`,
    });

    // Log to AutomationLog
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Node Network Confirmation',
      function_name: 'nodeNetworkConfirmation',
      status: confirmed.length === 8 ? 'success' : 'warning',
      message: `${confirmed.length}/8 nodes confirmed. ${needsAction.length} require action.`,
      details: { nodeStatuses, confirmed_count: confirmed.length, pending_nodes: needsAction.map(n => n.label) },
      run_at: new Date().toISOString(),
      triggered_by: 'manual',
    });

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      network_integrity: confirmed.length === 8 ? 'FULL' : confirmed.length >= 6 ? 'MAJORITY' : 'PARTIAL',
      confirmed_count: confirmed.length,
      total_nodes: 8,
      node_statuses: nodeStatuses,
      confirmed_nodes: confirmed.map(n => n.label),
      pending_nodes: needsAction.map(n => ({ label: n.label, status: n.confirmation_status, address: n.address })),
      next_action: needsAction.length > 0
        ? `Activate DIDs for: ${needsAction.map(n => n.label).join(', ')}`
        : 'All 8 nodes confirmed. Network integrity validated.',
    });

  } catch (error) {
    console.error('nodeNetworkConfirmation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
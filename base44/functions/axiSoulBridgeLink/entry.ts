import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Axi ↔ SoulBridge Node — Two-Way Link (Octagon Blueprint)
 *
 * POST /axiSoulBridgeLink
 *
 * direction: "axi_to_node" | "node_to_axi"
 *
 * ── AXI → NODE (Query / Command) ──────────────────────────────────────────
 * action: "query_did"         → { did_address? }
 * action: "query_treasury"    → { address? }
 * action: "query_ku_flows"    → {}
 * action: "command_activate_did" → { wallet_id, agent_id }
 * action: "command_veto"      → { target_entity, target_id, reason }
 *
 * ── NODE → AXI (Event Push) ───────────────────────────────────────────────
 * action: "event_did_activated"      → { did_address, agent_id, txid }
 * action: "event_treasury_anomaly"   → { detail, severity }
 * action: "event_governance_trigger" → { proposal_id, trigger_type }
 * action: "event_kinetic_alert"      → { message, threshold_breached }
 * action: "event_error_report"       → { source, error_message }
 */

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const XRPL_ENDPOINTS   = ['https://xrplcluster.com/', 'https://s1.ripple.com:51234/'];

async function xrplFetch(body) {
  for (const url of XRPL_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  return null;
}

async function auditLog(base44, { action, direction, actor, payload, result, status }) {
  const msg = `[${direction.toUpperCase()}] ${action} — ${status}`;
  await base44.asServiceRole.entities.AutomationLog.create({
    automation_name: 'Axi↔SoulBridge Link',
    function_name: 'axiSoulBridgeLink',
    status,
    message: msg,
    details: { action, direction, actor, payload, result },
    run_at: new Date().toISOString(),
    triggered_by: direction === 'axi_to_node' ? 'agent' : 'system',
  });
}

async function saveMemory(base44, { content, type = 'observation', keywords = [] }) {
  await base44.asServiceRole.entities.Memory.create({
    agent_id: 'axi',
    type,
    content,
    keywords: ['axi-soulbridge-link', ...keywords],
    importance: 7,
    context: 'Axi↔SoulBridge two-way link event',
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { direction, action, ...params } = body;

    if (!direction || !action) {
      return Response.json({ error: 'direction and action are required' }, { status: 400 });
    }

    let result = {};

    // ── AXI → NODE ────────────────────────────────────────────────────────
    if (direction === 'axi_to_node') {

      // ── query_did ──────────────────────────────────────────────────────
      if (action === 'query_did') {
        const address = params.did_address;
        const [wallets, agents] = await Promise.all([
          address
            ? base44.asServiceRole.entities.Wallet.filter({ classic_address: address })
            : base44.asServiceRole.entities.Wallet.list('-updated_date', 20),
          base44.asServiceRole.entities.Agent.list('-updated_date', 20),
        ]);
        result = {
          total_wallets: wallets.length,
          published: wallets.filter(w => w.is_published).length,
          unpublished: wallets.filter(w => !w.is_published).length,
          wallets: wallets.map(w => ({
            id: w.id,
            classic_address: w.classic_address,
            name: w.name,
            network: w.network,
            is_published: w.is_published,
            published_at: w.published_at,
            published_txid: w.published_txid,
          })),
          agents_count: agents.length,
        };
      }

      // ── query_treasury ─────────────────────────────────────────────────
      else if (action === 'query_treasury') {
        const address = params.address || TREASURY_ADDRESS;
        const [info, txs] = await Promise.all([
          xrplFetch({ method: 'account_info', params: [{ account: address, ledger_index: 'current' }] }),
          xrplFetch({ method: 'account_tx',   params: [{ account: address, limit: 10 }] }),
        ]);
        const balanceXRP = info?.account_data
          ? parseInt(info.account_data.Balance, 10) / 1e6
          : null;

        // Check governance limits
        const limits = await base44.asServiceRole.entities.GovernanceLimits.filter({ is_active: true });

        result = {
          address,
          balance_xrp: balanceXRP,
          balance_drops: info?.account_data?.Balance || null,
          ledger_index: info?.account_data?.Sequence || null,
          recent_transactions: txs?.transactions?.slice(0, 5).map(t => ({
            hash: t.tx?.hash || t.tx_json?.hash,
            type: t.tx?.TransactionType || t.tx_json?.TransactionType,
            amount: t.tx?.Amount || t.tx_json?.Amount,
            date: t.tx?.date || t.tx_json?.date,
          })) || [],
          governance_limits: limits.map(l => ({
            name: l.limit_name,
            value: l.value,
            currency: l.currency,
            requires_human_approval_above: l.requires_human_approval_above,
          })),
        };
      }

      // ── query_ku_flows ─────────────────────────────────────────────────
      else if (action === 'query_ku_flows') {
        const [activities, vaults] = await Promise.all([
          base44.asServiceRole.entities.EconomicActivity.list('-created_date', 50),
          base44.asServiceRole.entities.LiquidityVault.list('-created_date', 10).catch(() => []),
        ]);
        const total = activities.reduce((s, a) => s + (a.amount || 0), 0);
        const byType = activities.reduce((acc, a) => {
          acc[a.activity_type] = (acc[a.activity_type] || 0) + (a.amount || 0);
          return acc;
        }, {});
        result = {
          total_ku_flow_xrp: total,
          by_type: byType,
          recent_count: activities.length,
          active_vaults: vaults.length,
          health: total > 0 ? 'active' : 'dormant',
        };
      }

      // ── command_activate_did ───────────────────────────────────────────
      else if (action === 'command_activate_did') {
        if (user.role !== 'admin') {
          return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
        }
        const res = await base44.asServiceRole.functions.invoke('activateDID', {
          wallet_id: params.wallet_id,
          agent_id: params.agent_id,
        });
        result = { invoked: true, response: res };
      }

      // ── command_veto ───────────────────────────────────────────────────
      else if (action === 'command_veto') {
        if (user.role !== 'admin') {
          return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
        }
        const res = await base44.asServiceRole.functions.invoke('intentOverride', {
          action: 'veto',
          target_entity: params.target_entity,
          target_id: params.target_id,
          reason: params.reason,
        });
        result = { invoked: true, response: res };
      }

      else {
        return Response.json({ error: `Unknown axi_to_node action: ${action}` }, { status: 400 });
      }
    }

    // ── NODE → AXI ────────────────────────────────────────────────────────
    else if (direction === 'node_to_axi') {

      if (action === 'event_did_activated') {
        const { did_address, agent_id, txid } = params;
        await saveMemory(base44, {
          content: `DID Activated: ${did_address} — Agent: ${agent_id} — TXID: ${txid}`,
          type: 'fact',
          keywords: ['did_activation', did_address, agent_id],
        });
        // Notify all admin agents
        const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
        if (agents.length) {
          await base44.asServiceRole.entities.AgentNotification.bulkCreate(
            agents.slice(0, 10).map(ag => ({
              agent_id: ag.id,
              title: '✅ DID Activated',
              message: `DID ${did_address} published on XRPL. TXID: ${txid}`,
              notification_type: 'system',
              is_read: false,
            }))
          );
        }
        result = { event_recorded: true, memory_saved: true, notifications_sent: Math.min(agents.length, 10) };
      }

      else if (action === 'event_treasury_anomaly') {
        const { detail, severity = 'high' } = params;
        await saveMemory(base44, {
          content: `Treasury Anomaly [${severity}]: ${detail}`,
          type: 'observation',
          keywords: ['treasury_anomaly', severity],
        });
        // Create a governance proposal draft for critical anomalies
        if (severity === 'critical') {
          await base44.asServiceRole.entities.GovernanceProposal.create({
            title: `[ALERT] Treasury Anomaly Detected`,
            description: `**Severity:** ${severity}\n\n**Detail:** ${detail}\n\n**Detected by:** SoulBridge Node → Axi link\n**Timestamp:** ${new Date().toISOString()}`,
            proposal_type: 'treasury_allocation',
            proposed_by: 'axi_intelligence_system',
            status: 'draft',
            voting_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
        result = { event_recorded: true, severity, proposal_created: severity === 'critical' };
      }

      else if (action === 'event_governance_trigger') {
        const { proposal_id, trigger_type } = params;
        await saveMemory(base44, {
          content: `Governance Trigger [${trigger_type}] on proposal ${proposal_id}`,
          type: 'fact',
          keywords: ['governance_trigger', trigger_type, proposal_id],
        });
        result = { event_recorded: true, trigger_type, proposal_id };
      }

      else if (action === 'event_kinetic_alert') {
        const { message, threshold_breached } = params;
        await saveMemory(base44, {
          content: `Kinetic Grid Alert: ${message} — Threshold: ${threshold_breached}`,
          type: 'observation',
          keywords: ['kinetic_alert', 'ku_flow'],
        });
        result = { event_recorded: true, threshold_breached };
      }

      else if (action === 'event_error_report') {
        const { source, error_message } = params;
        await saveMemory(base44, {
          content: `Error from ${source}: ${error_message}`,
          type: 'observation',
          keywords: ['error_report', source],
        });
        result = { event_recorded: true, source };
      }

      else {
        return Response.json({ error: `Unknown node_to_axi action: ${action}` }, { status: 400 });
      }
    }

    else {
      return Response.json({ error: 'direction must be "axi_to_node" or "node_to_axi"' }, { status: 400 });
    }

    // ── Audit every interaction ────────────────────────────────────────────
    await auditLog(base44, {
      action,
      direction,
      actor: user.email,
      payload: params,
      result,
      status: 'success',
    });

    return Response.json({
      success: true,
      direction,
      action,
      timestamp: new Date().toISOString(),
      result,
    });

  } catch (error) {
    console.error('axiSoulBridgeLink error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
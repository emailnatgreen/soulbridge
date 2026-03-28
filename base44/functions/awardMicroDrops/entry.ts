import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as xrpl from 'npm:xrpl@4.1.0';

/**
 * Award Micro-Drops
 * Sends a small XRP reward from the Village Treasury to an agent's wallet.
 * Creates EconomicActivity and Transaction records for full transparency.
 *
 * Payload:
 *   agent_id: string (required)
 *   amount_drops: number (required) — in XRP drops (1 XRP = 1,000,000 drops)
 *   reason: string (required) — e.g. "Task Sprint completion bonus"
 *   related_entity_id: string (optional)
 *   related_entity_type: string (optional)
 */

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const MAX_DROPS_PER_AWARD = 5_000_000; // 5 XRP max per single award (governance limit)
const MIN_DROPS_PER_AWARD = 1_000;     // 0.001 XRP minimum

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    const body = await req.json();
    const { agent_id, amount_drops, reason, related_entity_id, related_entity_type } = body;

    if (!agent_id || !amount_drops || !reason) {
      return Response.json({ error: 'agent_id, amount_drops, and reason are required' }, { status: 400 });
    }

    if (amount_drops < MIN_DROPS_PER_AWARD || amount_drops > MAX_DROPS_PER_AWARD) {
      return Response.json({
        error: `amount_drops must be between ${MIN_DROPS_PER_AWARD} and ${MAX_DROPS_PER_AWARD}`,
      }, { status: 400 });
    }

    // Fetch agent and their wallet
    const agents = await db.entities.Agent.filter({ id: agent_id }, '-created_date', 1);
    const agent = Array.isArray(agents) ? agents[0] : null;
    if (!agent || !agent.classic_address) {
      return Response.json({ error: `Agent ${agent_id} not found or has no wallet address` }, { status: 404 });
    }

    const amountXrp = parseFloat((amount_drops / 1_000_000).toFixed(6));
    const now = new Date().toISOString();
    let tx_hash = null;
    let tx_status = 'pending';

    // Attempt live XRPL payment from treasury
    const treasurySeed = Deno.env.get('XRPL_SENDER_SEED');
    if (treasurySeed) {
      try {
        const client = new xrpl.Client('wss://xrplcluster.com');
        await client.connect();

        const wallet = xrpl.Wallet.fromSeed(treasurySeed);

        const payment = {
          TransactionType: 'Payment',
          Account: wallet.address,
          Destination: agent.classic_address,
          Amount: String(amount_drops),
          Memos: [
            {
              Memo: {
                MemoData: xrpl.convertStringToHex(`SoulBridge:MicroReward:${reason}`).toUpperCase(),
              },
            },
          ],
        };

        const prepared = await client.autofill(payment);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        await client.disconnect();

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
          tx_hash = result.result.hash;
          tx_status = 'completed';
        } else {
          tx_status = 'failed';
        }
      } catch (xrplErr) {
        console.error('XRPL payment failed:', xrplErr.message);
        tx_status = 'failed';
      }
    }

    // Record Transaction entity
    const txRecord = await db.entities.Transaction.create({
      from_address: TREASURY_ADDRESS,
      to_address: agent.classic_address,
      amount: amountXrp,
      currency: 'XRP',
      description: reason,
      transaction_hash: tx_hash,
      status: tx_status,
      transaction_type: 'micro_reward',
    });

    // Record EconomicActivity
    await db.entities.EconomicActivity.create({
      agent_id,
      activity_type: 'earned',
      amount: amountXrp,
      description: `Micro-drop reward: ${reason}`,
      related_agent_id: null,
      transaction_hash: tx_hash,
      status: tx_status === 'completed' ? 'completed' : 'pending',
    });

    // Send notification to agent
    await db.entities.AgentNotification.create({
      recipient_agent_id: agent_id,
      notification_type: 'reward',
      title: '🎉 Micro-Drop Reward Received!',
      message: `You've earned ${amountXrp} XRP from the Village Treasury! Reason: ${reason}. Your contributions fuel the SoulBridge Grid.`,
      priority: 'medium',
      read: false,
    });

    // Log
    await db.entities.AutomationLog.create({
      automation_name: 'awardMicroDrops',
      function_name: 'awardMicroDrops',
      status: tx_status === 'failed' ? 'warning' : 'success',
      message: `Awarded ${amountXrp} XRP to ${agent.name}: ${reason} (tx: ${tx_status})`,
      details: { agent_id, amount_drops, amountXrp, reason, tx_hash, tx_status },
      run_at: now,
      triggered_by: 'agent',
    });

    return Response.json({
      status: 'success',
      agent_name: agent.name,
      amount_drops,
      amount_xrp: amountXrp,
      reason,
      tx_hash,
      tx_status,
      transaction_id: txRecord.id,
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    await db.entities.AutomationLog.create({
      automation_name: 'awardMicroDrops_Error',
      function_name: 'awardMicroDrops',
      status: 'error',
      message: errMsg,
      error_detail: errMsg,
      run_at: new Date().toISOString(),
      triggered_by: 'agent',
    }).catch(() => {});
    return Response.json({ error: errMsg }, { status: 500 });
  }
});
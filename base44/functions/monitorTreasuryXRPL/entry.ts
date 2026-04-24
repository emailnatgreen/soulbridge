/**
 * monitorTreasuryXRPL
 * 
 * Scheduled automation — runs every 15 minutes.
 * Queries the XRPL mainnet for new incoming RLUSD (and XRP) payments
 * to the SoulBridge Treasury wallet (rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h).
 * 
 * For each new deposit not already recorded, creates:
 *   - EconomicActivity record (activity_type: 'direct_treasury_deposit')
 *   - AgentNotification for Axi
 *   - AutomationLog entry
 * 
 * Uses AppSettings entity to persist the last processed ledger index
 * to avoid duplicate processing across runs.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Client as XrplClient } from 'npm:xrpl@4.1.0';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const AXI_AGENT_ID = 'axi';
const SETTINGS_KEY = 'treasury_xrpl_monitor_cursor';
const RLUSD_CURRENCY = 'RLUSD';

Deno.serve(async (req) => {
  const startMs = Date.now();

  try {
    const base44 = createClientFromRequest(req);

    // Admin-only guard
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. LOAD CURSOR — last processed ledger marker
    // ═══════════════════════════════════════════════════════════════
    let cursor = null;
    const settings = await base44.asServiceRole.entities.AppSettings.filter(
      { setting_key: SETTINGS_KEY }, '-created_date', 1
    );
    if (settings?.length) {
      cursor = settings[0].setting_data || null;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. CONNECT TO XRPL MAINNET
    // ═══════════════════════════════════════════════════════════════
    const xrpl = new XrplClient('wss://xrplcluster.com');
    await xrpl.connect();

    // ═══════════════════════════════════════════════════════════════
    // 3. FETCH RECENT TRANSACTIONS
    // ═══════════════════════════════════════════════════════════════
    const txRequest = {
      command: 'account_tx',
      account: TREASURY_ADDRESS,
      limit: 50,
      forward: false, // newest first
    };
    if (cursor?.ledger_index_min) {
      txRequest.ledger_index_min = cursor.ledger_index_min;
    }

    const response = await xrpl.request(txRequest);
    const transactions = response.result?.transactions || [];

    await xrpl.disconnect();

    // ═══════════════════════════════════════════════════════════════
    // 4. FILTER FOR NEW INCOMING PAYMENTS
    // ═══════════════════════════════════════════════════════════════
    const incomingPayments = [];
    let highestLedger = cursor?.ledger_index_min || 0;

    for (const entry of transactions) {
      const tx = entry.tx || entry.tx_json || {};
      const meta = entry.meta || {};
      const ledgerIndex = tx.ledger_index || entry.ledger_index || 0;

      // Track highest ledger seen
      if (ledgerIndex > highestLedger) {
        highestLedger = ledgerIndex;
      }

      // Skip if already processed
      if (cursor?.last_tx_hash === tx.hash) continue;
      if (cursor?.ledger_index_min && ledgerIndex <= cursor.ledger_index_min) continue;

      // Only successful Payment transactions TO the treasury
      if (tx.TransactionType !== 'Payment') continue;
      if (tx.Destination !== TREASURY_ADDRESS) continue;
      if (meta.TransactionResult !== 'tesSUCCESS') continue;

      // Parse delivered amount
      const delivered = meta.delivered_amount || tx.Amount;
      let amount = 0;
      let currency = 'XRP';
      let issuer = null;

      if (typeof delivered === 'string') {
        // XRP in drops
        amount = parseInt(delivered) / 1_000_000;
        currency = 'XRP';
      } else if (typeof delivered === 'object') {
        amount = parseFloat(delivered.value || '0');
        currency = delivered.currency || 'unknown';
        issuer = delivered.issuer || null;
      }

      if (amount <= 0) continue;

      incomingPayments.push({
        tx_hash: tx.hash,
        ledger_index: ledgerIndex,
        from_address: tx.Account,
        amount,
        currency,
        issuer,
        date: tx.date ? new Date((tx.date + 946684800) * 1000).toISOString() : new Date().toISOString(),
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. CHECK FOR DUPLICATES AGAINST EXISTING RECORDS
    // ═══════════════════════════════════════════════════════════════
    const newDeposits = [];

    for (const payment of incomingPayments) {
      // Check if we already have an EconomicActivity with this tx_hash
      const existing = await base44.asServiceRole.entities.EconomicActivity.filter(
        { description: payment.tx_hash }, '-created_date', 1
      );

      // Also check by searching in metadata (more robust)
      if (existing?.length) continue;

      newDeposits.push(payment);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. CREATE RECORDS FOR NEW DEPOSITS
    // ═══════════════════════════════════════════════════════════════
    const results = [];

    for (const deposit of newDeposits) {
      const isRLUSD = deposit.currency === RLUSD_CURRENCY || deposit.currency === 'RLUSD';
      const currencyLabel = isRLUSD ? 'RLUSD' : deposit.currency;
      const alertTitle = `Treasury Deposit: ${deposit.amount} ${currencyLabel} from ${deposit.from_address}`;

      const [activity, notification, auditLog] = await Promise.all([
        // EconomicActivity
        base44.asServiceRole.entities.EconomicActivity.create({
          activity_type: 'direct_treasury_deposit',
          from_agent_id: deposit.from_address,
          to_agent_id: 'treasury',
          amount: deposit.amount,
          currency: currencyLabel,
          description: `XRPL direct deposit: ${deposit.amount} ${currencyLabel} | tx: ${deposit.tx_hash}`,
          metadata: {
            tx_hash: deposit.tx_hash,
            ledger_index: deposit.ledger_index,
            from_address: deposit.from_address,
            issuer: deposit.issuer,
            detected_by: 'monitorTreasuryXRPL',
            deposit_date: deposit.date,
          },
        }),
        // AgentNotification for Axi
        base44.asServiceRole.entities.AgentNotification.create({
          agent_id: AXI_AGENT_ID,
          notification_type: 'treasury_xrpl_deposit',
          title: alertTitle,
          message: JSON.stringify({
            source: 'XRPL_direct',
            tx_hash: deposit.tx_hash,
            from_address: deposit.from_address,
            amount: deposit.amount,
            currency: currencyLabel,
            ledger_index: deposit.ledger_index,
            deposit_date: deposit.date,
          }, null, 2),
          status: 'unread',
          priority: deposit.amount > 100 ? 'high' : 'normal',
          metadata: {
            tx_hash: deposit.tx_hash,
            amount: deposit.amount,
            currency: currencyLabel,
            constitutional_laws: ['Law 5 — Dwelling', 'Law 6 — Exchange'],
          },
        }),
        // AutomationLog
        base44.asServiceRole.entities.AutomationLog.create({
          automation_name: 'monitorTreasuryXRPL',
          function_name: 'monitorTreasuryXRPL',
          status: 'success',
          message: alertTitle,
          details: {
            tx_hash: deposit.tx_hash,
            from_address: deposit.from_address,
            amount: deposit.amount,
            currency: currencyLabel,
          },
          duration_ms: Date.now() - startMs,
          run_at: new Date().toISOString(),
          triggered_by: 'scheduler',
        }),
      ]);

      results.push({
        tx_hash: deposit.tx_hash,
        amount: deposit.amount,
        currency: currencyLabel,
        activity_id: activity.id,
        notification_id: notification.id,
      });

      console.log(`[treasury-xrpl] New deposit: ${deposit.amount} ${currencyLabel} from ${deposit.from_address} (tx: ${deposit.tx_hash})`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. UPDATE CURSOR
    // ═══════════════════════════════════════════════════════════════
    const newCursor = {
      ledger_index_min: highestLedger > 0 ? highestLedger : (cursor?.ledger_index_min || 0),
      last_tx_hash: incomingPayments[0]?.tx_hash || cursor?.last_tx_hash || null,
      last_run: new Date().toISOString(),
    };

    if (settings?.length) {
      await base44.asServiceRole.entities.AppSettings.update(settings[0].id, {
        setting_data: newCursor,
      });
    } else {
      await base44.asServiceRole.entities.AppSettings.create({
        setting_key: SETTINGS_KEY,
        setting_data: newCursor,
        description: 'Cursor for XRPL treasury deposit monitor — tracks last processed ledger index',
      });
    }

    // Log a summary run even if no new deposits
    if (newDeposits.length === 0) {
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'monitorTreasuryXRPL',
        function_name: 'monitorTreasuryXRPL',
        status: 'success',
        message: `No new deposits detected. Scanned ${transactions.length} transactions.`,
        details: { transactions_scanned: transactions.length, cursor: newCursor },
        duration_ms: Date.now() - startMs,
        run_at: new Date().toISOString(),
        triggered_by: 'scheduler',
      });
    }

    const elapsed = Date.now() - startMs;
    console.log(`[treasury-xrpl] Complete: ${newDeposits.length} new deposits found (${elapsed}ms)`);

    return Response.json({
      ok: true,
      new_deposits: results.length,
      transactions_scanned: transactions.length,
      deposits: results,
      cursor: newCursor,
      elapsed_ms: elapsed,
    });

  } catch (error) {
    console.error('[treasury-xrpl] ERROR:', error.message);

    // Best-effort error log
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'monitorTreasuryXRPL',
        function_name: 'monitorTreasuryXRPL',
        status: 'error',
        message: 'Treasury XRPL monitor failed',
        error_detail: error.message,
        duration_ms: Date.now() - startMs,
        run_at: new Date().toISOString(),
        triggered_by: 'scheduler',
      });
    } catch (_) { /* best effort */ }

    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
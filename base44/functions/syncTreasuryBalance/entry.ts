import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const XRPL_HTTP = 'https://xrplcluster.com';

async function getXrpBalance(address) {
    const res = await fetch(XRPL_HTTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'account_info',
            params: [{ account: address, ledger_index: 'validated' }]
        })
    });
    const json = await res.json();
    if (json.result?.error) throw new Error(json.result.error_message || json.result.error);
    const drops = json.result?.account_data?.Balance;
    if (!drops) throw new Error('No balance returned');
    return parseFloat(drops) / 1_000_000;
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    const base44 = createClientFromRequest(req);

    let isScheduler = false;
    try {
        const user = await base44.auth.me();
        if (!user) isScheduler = true;
    } catch {
        isScheduler = true;
    }

    const logEntry = {
        automation_name: 'Sync Treasury Balance',
        function_name: 'syncTreasuryBalance',
        status: 'success',
        message: '',
        run_at: new Date().toISOString(),
        triggered_by: isScheduler ? 'scheduler' : 'manual',
        details: {}
    };

    try {
        const treasuries = await base44.asServiceRole.entities.Treasury.list();
        if (!treasuries || treasuries.length === 0) {
            logEntry.message = 'No treasuries to sync';
            logEntry.duration_ms = Date.now() - startTime;
            await base44.asServiceRole.entities.AutomationLog.create(logEntry);
            return Response.json({ success: true, synced_count: 0 });
        }

        let syncedCount = 0;
        const results = [];

        await Promise.all(treasuries.map(async (treasury) => {
            if (!treasury.classic_address) return;
            try {
                const balance = await getXrpBalance(treasury.classic_address);
                await base44.asServiceRole.entities.Treasury.update(treasury.id, { total_balance: balance });
                syncedCount++;
                results.push({ treasury_id: treasury.id, balance, address: treasury.classic_address });
            } catch (err) {
                console.error(`Failed to sync treasury ${treasury.id}:`, err.message);
                results.push({ treasury_id: treasury.id, error: err.message });
            }
        }));

        logEntry.message = `Synced ${syncedCount}/${treasuries.length} treasuries`;
        logEntry.details = { synced_count: syncedCount, total_treasuries: treasuries.length, results };
        logEntry.duration_ms = Date.now() - startTime;
        await base44.asServiceRole.entities.AutomationLog.create(logEntry);

        return Response.json({ success: true, synced_count: syncedCount, total: treasuries.length });

    } catch (error) {
        console.error('syncTreasuryBalance error:', error.message);
        logEntry.status = 'error';
        logEntry.message = `Unexpected error: ${error.message}`;
        logEntry.error_detail = error.message;
        logEntry.duration_ms = Date.now() - startTime;
        try {
            await base44.asServiceRole.entities.AutomationLog.create(logEntry);
        } catch (logErr) {
            console.error('Failed to write AutomationLog:', logErr.message);
        }
        return Response.json({ error: error.message }, { status: 500 });
    }
});
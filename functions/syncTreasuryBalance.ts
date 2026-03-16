import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, dropsToXrp } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const base44 = createClientFromRequest(req);

    // Support both authenticated requests and scheduler calls
    let isScheduler = false;
    try {
        const user = await base44.auth.me();
        if (!user) {
            // Allow service-role scheduler calls
            isScheduler = true;
        }
    } catch {
        isScheduler = true;
    }

    let logEntry = {
        automation_name: 'Sync Treasury Balance',
        function_name: 'syncTreasuryBalance',
        status: 'success',
        message: '',
        run_at: new Date().toISOString(),
        triggered_by: isScheduler ? 'scheduler' : 'manual',
        details: {}
    };

    try {
        // Fetch all treasuries to sync
        const treasuries = await base44.asServiceRole.entities.Treasury.list();
        if (!treasuries || treasuries.length === 0) {
            logEntry.status = 'success';
            logEntry.message = 'No treasuries to sync';
            logEntry.duration_ms = Date.now() - startTime;
            await base44.asServiceRole.entities.AutomationLog.create(logEntry);
            return Response.json({ success: true, synced_count: 0 });
        }

        const client = new Client('wss://xrpl.ws');
        await client.connect();

        let syncedCount = 0;
        const results = [];

        // Sync each treasury in parallel
        const syncPromises = treasuries.map(async (treasury) => {
            if (!treasury.classic_address) return null;
            try {
                const accountInfo = await client.request({
                    command: 'account_info',
                    account: treasury.classic_address,
                    ledger_index: 'validated',
                });
                const balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
                
                // Update treasury balance
                await base44.asServiceRole.entities.Treasury.update(treasury.id, {
                    total_balance: balance,
                });
                syncedCount++;
                results.push({ treasury_id: treasury.id, balance, address: treasury.classic_address });
            } catch (err) {
                console.error(`Failed to sync treasury ${treasury.id}:`, err.message);
                results.push({ treasury_id: treasury.id, error: err.message });
            }
        });

        await Promise.all(syncPromises);
        await client.disconnect();

        // Write success log
        logEntry.status = 'success';
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
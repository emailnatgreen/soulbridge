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
        const body = await req.json().catch(() => ({}));
        const { treasury_id, classic_address } = body;

        if (!classic_address) {
            logEntry.status = 'error';
            logEntry.message = 'classic_address is required';
            logEntry.error_detail = 'No classic_address provided in request body';
            await base44.asServiceRole.entities.AutomationLog.create(logEntry);
            return Response.json({ error: 'classic_address is required' }, { status: 400 });
        }

        const client = new Client('wss://xrpl.ws');
        await client.connect();

        let balance = 0;
        try {
            const accountInfo = await client.request({
                command: 'account_info',
                account: classic_address,
                ledger_index: 'validated',
            });
            balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
        } catch (err) {
            console.log('account_info failed:', err.message);
            logEntry.status = 'error';
            logEntry.message = `XRPL account_info failed: ${err.message}`;
            logEntry.error_detail = err.message;
            await client.disconnect();
            logEntry.duration_ms = Date.now() - startTime;
            await base44.asServiceRole.entities.AutomationLog.create(logEntry);
            return Response.json({ error: err.message }, { status: 500 });
        }

        await client.disconnect();

        // Update the Treasury record if we have an ID
        if (treasury_id) {
            await base44.asServiceRole.entities.Treasury.update(treasury_id, {
                total_balance: balance,
            });
        }

        // Write success log
        logEntry.status = 'success';
        logEntry.message = `Treasury synced: ${balance.toFixed(6)} XRP at ${classic_address}`;
        logEntry.details = { balance, classic_address, treasury_id: treasury_id || null };
        logEntry.duration_ms = Date.now() - startTime;
        await base44.asServiceRole.entities.AutomationLog.create(logEntry);

        return Response.json({ success: true, balance, classic_address });

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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const XRPL_TESTNET = 'https://s.altnet.rippletest.net:51234';
const LARGE_TRANSFER_THRESHOLD_XRP = 1000;

async function fetchAccountTransactions(address, limit = 20) {
    const res = await fetch(XRPL_TESTNET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'account_tx',
            params: [{ account: address, limit, ledger_index_min: -1, ledger_index_max: -1 }]
        })
    });
    const data = await res.json();
    return data?.result?.transactions || [];
}

async function fetchServerInfo() {
    const res = await fetch(XRPL_TESTNET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'server_info', params: [{}] })
    });
    const data = await res.json();
    return data?.result?.info || {};
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch all Village wallets
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ network: 'testnet' });
        const treasuries = await base44.asServiceRole.entities.Treasury.filter({});

        const allAddresses = [
            ...wallets.map(w => ({ address: w.classic_address, label: w.name || 'Wallet', type: 'wallet' })),
            ...treasuries.filter(t => t.classic_address).map(t => ({ address: t.classic_address, label: t.name, type: 'treasury' }))
        ].filter(a => a.address);

        const alerts = [];
        const summary = { wallets_scanned: allAddresses.length, transactions_checked: 0, alerts_raised: 0 };

        // Check network health
        const serverInfo = await fetchServerInfo();
        const serverState = serverInfo?.server_state;
        if (serverState && !['full', 'validating'].includes(serverState)) {
            alerts.push({
                level: 'warning',
                type: 'network_health',
                message: `XRPL network state degraded: ${serverState}`,
                data: { server_state: serverState }
            });
        }

        // Scan each address for anomalies
        const cutoffTime = Date.now() - (6 * 60 * 60 * 1000); // last 6 hours

        for (const { address, label, type } of allAddresses) {
            const txs = await fetchAccountTransactions(address, 20);
            summary.transactions_checked += txs.length;

            for (const tx of txs) {
                const t = tx.tx || tx;
                const closedAt = t.date ? (t.date + 946684800) * 1000 : 0; // ripple epoch offset
                if (closedAt < cutoffTime) continue;

                // Large transfer detection
                if (t.TransactionType === 'Payment' && t.Amount) {
                    const amountXRP = typeof t.Amount === 'string' ? parseInt(t.Amount) / 1_000_000 : 0;
                    if (amountXRP >= LARGE_TRANSFER_THRESHOLD_XRP) {
                        const direction = t.Destination === address ? 'RECEIVED' : 'SENT';
                        alerts.push({
                            level: 'critical',
                            type: 'large_transfer',
                            message: `Large transfer on ${label} (${type}): ${direction} ${amountXRP.toFixed(2)} XRP`,
                            data: { address, label, type, amount_xrp: amountXRP, direction, hash: t.hash }
                        });
                    }
                }

                // Escrow creation/finish
                if (['EscrowCreate', 'EscrowFinish', 'EscrowCancel'].includes(t.TransactionType)) {
                    alerts.push({
                        level: 'info',
                        type: 'escrow_activity',
                        message: `Escrow activity on ${label}: ${t.TransactionType}`,
                        data: { address, label, type, tx_type: t.TransactionType, hash: t.hash }
                    });
                }
            }
        }

        // Dispatch notifications for non-info alerts
        const criticalAlerts = alerts.filter(a => a.level === 'critical');
        const warningAlerts = alerts.filter(a => a.level === 'warning');

        for (const alert of criticalAlerts) {
            // Fetch Ripple Architect agent
            const agents = await base44.asServiceRole.entities.Agent.filter({ role: 'creator' });
            const rippleArchitect = agents.find(a => a.name?.toLowerCase().includes('ripple'));

            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: rippleArchitect?.id || 'axi_main_001',
                title: `🚨 XRPL Critical Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
                message: alert.message,
                type: 'security',
                priority: 'critical',
                read: false,
                action_url: '/RippleDashboard'
            });
            summary.alerts_raised++;
        }

        for (const alert of warningAlerts) {
            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: 'axi_main_001',
                title: `⚠️ XRPL Warning: ${alert.type.replace(/_/g, ' ')}`,
                message: alert.message,
                type: 'security',
                priority: 'high',
                read: false,
                action_url: '/RippleDashboard'
            });
            summary.alerts_raised++;
        }

        return Response.json({
            success: true,
            scanned_at: new Date().toISOString(),
            summary,
            alerts
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
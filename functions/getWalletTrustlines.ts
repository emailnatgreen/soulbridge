import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, dropsToXrp } from 'npm:xrpl@3.0.0';

// Decode XRPL currency codes: 3-char ASCII or 40-char hex
function decodeCurrency(currency) {
    if (!currency) return 'UNKNOWN';
    if (currency.length === 3) return currency;
    // 40-char hex: try ASCII decode
    try {
        const hex = currency.replace(/^0+|0+$/g, '');
        const decoded = hex.match(/.{1,2}/g)
            ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
            .join('')
            .replace(/\x00/g, '')
            .trim();
        return decoded && decoded.length > 0 ? decoded : currency.slice(0, 8) + '…';
    } catch {
        return currency.slice(0, 8) + '…';
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { address, wallet_id, network } = await req.json();

        let checkAddress = address;
        let walletNetwork = network || 'mainnet';

        if (wallet_id) {
            const wallet = await base44.entities.Wallet.get(wallet_id);
            if (!checkAddress) checkAddress = wallet?.classic_address;
            walletNetwork = wallet?.network || walletNetwork;
        }

        if (!checkAddress) {
            return Response.json({ error: 'address or wallet_id required' }, { status: 400 });
        }

        const wsUrl = walletNetwork === 'testnet'
            ? 'wss://s.altnet.rippletest.net:51233'
            : 'wss://xrpl.ws';

        const client = new Client(wsUrl);
        await client.connect();

        try {
            // Fetch XRP balance
            let xrp_balance = 0;
            try {
                const accountInfo = await client.request({
                    command: 'account_info',
                    account: checkAddress,
                    ledger_index: 'validated'
                });
                xrp_balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
            } catch (e) {
                if (e.data?.error === 'actNotFound') {
                    await client.disconnect();
                    return Response.json({
                        address: checkAddress,
                        xrp_balance: 0,
                        not_activated: true,
                        trustlines: []
                    });
                }
                throw e;
            }

            // Fetch ALL trustlines (no peer filter)
            const linesResult = await client.request({
                command: 'account_lines',
                account: checkAddress,
                ledger_index: 'validated'
            });

            await client.disconnect();

            const trustlines = (linesResult.result.lines || []).map(line => ({
                currency_code: line.currency,
                currency_display: decodeCurrency(line.currency),
                issuer: line.account,
                balance: parseFloat(line.balance),
                limit: parseFloat(line.limit),
                limit_peer: parseFloat(line.limit_peer),
                no_ripple: line.no_ripple ?? false,
                freeze: line.freeze ?? false,
                quality_in: line.quality_in,
                quality_out: line.quality_out
            }));

            return Response.json({
                address: checkAddress,
                xrp_balance,
                trustline_count: trustlines.length,
                trustlines
            });

        } catch (error) {
            await client.disconnect();
            throw error;
        }

    } catch (error) {
        console.error('getWalletTrustlines error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
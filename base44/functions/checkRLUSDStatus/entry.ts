import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, dropsToXrp } from 'npm:xrpl@3.0.0';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  limit: "1000000000"
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { address, wallet_id } = await req.json();
        
        let checkAddress = address;
        
        if (!checkAddress && wallet_id) {
            const wallet = await base44.entities.Wallet.get(wallet_id);
            checkAddress = wallet.classic_address;
        }

        if (!checkAddress) {
            return Response.json({ error: 'Address or wallet_id required' }, { status: 400 });
        }

        const client = new Client('wss://xrpl.ws');
        await client.connect();

        try {
            const accountInfo = await client.request({
                command: "account_info",
                account: checkAddress,
                ledger_index: "validated"
            });
            
            const balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
            
            const lines = await client.request({
                command: "account_lines",
                account: checkAddress,
                peer: RLUSD_CONFIG.issuer
            });
            
            const hasRLUSD = lines.result.lines.some(
                line => line.currency === RLUSD_CONFIG.currency
            );
            
            const rlusdBalance = hasRLUSD 
                ? lines.result.lines.find(l => l.currency === RLUSD_CONFIG.currency)?.balance || "0"
                : "0";

            await client.disconnect();
            
            return Response.json({
                address: checkAddress,
                xrp_balance: balance,
                has_rlusd_trustline: hasRLUSD,
                rlusd_balance: parseFloat(rlusdBalance),
                can_add_trustline: balance >= 1.2,
                needs_funding: balance < 1.2 ? (1.2 - balance) : 0,
                reserve_required: 0.2,
                ready: hasRLUSD && balance >= 1.2
            });
        } catch (error) {
            await client.disconnect();
            
            if (error.data?.error === 'actNotFound') {
                return Response.json({
                    address: checkAddress,
                    xrp_balance: 0,
                    has_rlusd_trustline: false,
                    rlusd_balance: 0,
                    can_add_trustline: false,
                    needs_funding: 1.2,
                    not_activated: true,
                    ready: false
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Error checking RLUSD status:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
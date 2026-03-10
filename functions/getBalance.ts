import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, dropsToXrp } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { wallet_id } = await req.json();
    if (!wallet_id) return Response.json({ error: 'wallet_id is required' }, { status: 400 });

    const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!walletRecord) return Response.json({ error: 'Wallet not found' }, { status: 404 });

    if (!walletRecord.classic_address) {
      return Response.json({ error: 'Wallet has no classic_address' }, { status: 400 });
    }

    const networkUrl = walletRecord.network === 'mainnet' ? 'wss://xrpl.ws' : 'wss://s.altnet.rippletest.net:51233';
    const client = new Client(networkUrl);
    await client.connect();

    let balance = 0;
    try {
      const accountInfo = await client.request({
        command: 'account_info',
        account: walletRecord.classic_address,
        ledger_index: 'validated'
      });
      balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
    } catch (err) {
      // Account may not be activated yet
      console.log('account_info failed:', err.message);
    }

    await client.disconnect();

    // Persist updated balance
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      balance,
      last_accessed: new Date().toISOString()
    });

    return Response.json({ success: true, balance, classic_address: walletRecord.classic_address });

  } catch (error) {
    console.error('getBalance error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
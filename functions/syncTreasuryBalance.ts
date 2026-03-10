import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, dropsToXrp } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { treasury_id, classic_address } = await req.json();
    if (!classic_address) return Response.json({ error: 'classic_address is required' }, { status: 400 });

    const client = new Client('wss://xrpl.ws'); // mainnet
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
    }

    await client.disconnect();

    // Update the Treasury record if we have an ID
    if (treasury_id) {
      await base44.asServiceRole.entities.Treasury.update(treasury_id, {
        total_balance: balance,
      });
    }

    return Response.json({ success: true, balance, classic_address });

  } catch (error) {
    console.error('syncTreasuryBalance error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
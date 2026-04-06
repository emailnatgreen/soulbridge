import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAINNET_RPC = 'https://xrplcluster.com';
const TESTNET_RPC = 'https://s.altnet.rippletest.net:51234';

async function getXrpBalance(address, network) {
  const rpcUrl = network === 'testnet' ? TESTNET_RPC : MAINNET_RPC;
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'account_info',
      params: [{ account: address, ledger_index: 'validated' }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json();
  if (json.result?.error) return null; // unfunded account
  const drops = json.result?.account_data?.Balance;
  if (!drops) return null;
  return parseFloat(drops) / 1_000_000;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Fetch all wallets
    const wallets = await base44.asServiceRole.entities.Wallet.list('-created_date', 200);
    if (!wallets || wallets.length === 0) {
      return Response.json({ success: true, synced: 0, total: 0 });
    }

    let synced = 0;
    const results = [];

    // Sync in parallel batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < wallets.length; i += batchSize) {
      const batch = wallets.slice(i, i + batchSize);
      await Promise.all(batch.map(async (wallet) => {
        if (!wallet.classic_address) return;
        try {
          const balance = await getXrpBalance(wallet.classic_address, wallet.network || 'mainnet');
          if (balance !== null && balance !== wallet.balance) {
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
              balance: balance,
              last_accessed: new Date().toISOString(),
            });
            synced++;
            results.push({ name: wallet.name, address: wallet.classic_address, old: wallet.balance, new: balance });
          }
        } catch (err) {
          console.error(`Failed ${wallet.name}:`, err.message);
        }
      }));
    }

    // Also sync treasury balances
    const treasuries = await base44.asServiceRole.entities.Treasury.list();
    let treasurySynced = 0;
    await Promise.all((treasuries || []).map(async (t) => {
      if (!t.classic_address || t.classic_address.includes('N/A')) return;
      try {
        const balance = await getXrpBalance(t.classic_address, 'mainnet');
        if (balance !== null && balance !== t.total_balance) {
          await base44.asServiceRole.entities.Treasury.update(t.id, { total_balance: balance });
          treasurySynced++;
        }
      } catch (err) {
        console.error(`Failed treasury ${t.name}:`, err.message);
      }
    }));

    console.log(`Synced ${synced} wallets, ${treasurySynced} treasuries`);
    return Response.json({
      success: true,
      wallets_synced: synced,
      treasuries_synced: treasurySynced,
      total_wallets: wallets.length,
      updates: results,
    });
  } catch (error) {
    console.error('syncAllWalletBalances error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
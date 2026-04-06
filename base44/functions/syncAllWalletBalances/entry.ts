import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAINNET_NODES = [
  'https://xrplcluster.com',
  'https://s1.ripple.com:51234',
  'https://s2.ripple.com:51234',
];

const TESTNET_NODES = [
  'https://s.altnet.rippletest.net:51234',
  'https://testnet.xrpl-labs.com',
];

async function getXrpBalance(address, network) {
  const nodes = network === 'testnet' ? TESTNET_NODES : MAINNET_NODES;

  for (const node of nodes) {
    try {
      const res = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{ account: address, ledger_index: 'validated' }],
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        console.log(`Node ${node} HTTP ${res.status} for ${address}`);
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        const text = await res.text().catch(() => '');
        console.log(`Node ${node} non-JSON: ${text.slice(0, 80)}`);
        continue;
      }

      const json = await res.json();
      if (json.result?.error === 'rateLimited' || json.result?.error === 'slowDown') {
        console.log(`Node ${node} rate limited for ${address}`);
        continue;
      }
      if (json.result?.error) return null; // unfunded account
      const drops = json.result?.account_data?.Balance;
      if (!drops) return null;
      return parseFloat(drops) / 1_000_000;
    } catch (e) {
      console.log(`Node ${node} error for ${address}: ${e.message}`);
      continue;
    }
  }
  console.warn(`All nodes failed for ${address}`);
  return null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const wallets = await base44.asServiceRole.entities.Wallet.list('-created_date', 200);
    if (!wallets || wallets.length === 0) {
      return Response.json({ success: true, synced: 0, total: 0 });
    }

    let synced = 0;
    const results = [];

    // Sync in batches of 3 with 1.5s delay between batches
    const batchSize = 3;
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
      if (i + batchSize < wallets.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Also sync treasury balances
    const treasuries = await base44.asServiceRole.entities.Treasury.list();
    let treasurySynced = 0;
    for (const t of (treasuries || [])) {
      if (!t.classic_address || t.classic_address.includes('N/A')) continue;
      try {
        const balance = await getXrpBalance(t.classic_address, 'mainnet');
        if (balance !== null && balance !== t.total_balance) {
          await base44.asServiceRole.entities.Treasury.update(t.id, { total_balance: balance });
          treasurySynced++;
        }
      } catch (err) {
        console.error(`Failed treasury ${t.name}:`, err.message);
      }
      await new Promise(r => setTimeout(r, 500));
    }

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
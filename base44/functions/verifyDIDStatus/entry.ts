import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Verifies DID by querying XRPL directly.
 * Accepts { wallet_id } to verify a specific wallet.
 * Falls back to user's first wallet if no wallet_id provided.
 */
Deno.serve(async (req) => {
  const RPC_ENDPOINTS = {
    mainnet: [
      'https://xrpl.ws',
      'https://xrplcluster.com',
      'https://s1.ripple.com:51234'
    ],
    testnet: [
      'https://testnet.xrpl.ws',
      'https://testnet.xrplcluster.com'
    ]
  };

  const queryXRPL = async (classicAddress, network) => {
    const endpoints = RPC_ENDPOINTS[network] || RPC_ENDPOINTS.mainnet;
    let lastError;

    for (const endpoint of endpoints) {
      try {
        const body = JSON.stringify({
          method: 'account_info',
          params: [{ account: classicAddress, ledger_index: 'validated' }]
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const rpcResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!rpcResponse.ok) throw new Error(`HTTP ${rpcResponse.status}`);

        const rpcData = await rpcResponse.json();
        if (rpcData.error) throw new Error(rpcData.error.message || JSON.stringify(rpcData.error));

        const accountData = rpcData.result?.account_data || rpcData.account_data || rpcData.result;
        if (accountData) return { success: true, data: accountData };

        throw new Error('No account data');
      } catch (err) {
        lastError = err;
        console.warn(`[verifyDIDStatus] ${endpoint} failed:`, err.message);
        continue;
      }
    }

    return { success: false, error: lastError?.message || 'All RPC endpoints failed' };
  };

  const checkDIDSetExists = async (classicAddress, network) => {
    const endpoints = RPC_ENDPOINTS[network] || RPC_ENDPOINTS.mainnet;

    for (const endpoint of endpoints) {
      try {
        const body = JSON.stringify({
          method: 'account_tx',
          params: [{
            account: classicAddress,
            ledger_index_min: -1,
            limit: 100
          }]
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const rpcResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!rpcResponse.ok) continue;

        const rpcData = await rpcResponse.json();
        if (rpcData.error) continue;

        const transactions = rpcData.result?.transactions || [];

        const hasDIDSet = transactions.some(tx => {
          const txn = tx.tx || tx.transaction;
          return txn && txn.TransactionType === 'DIDSet';
        });

        return { success: true, hasDIDSet };
      } catch (err) {
        console.warn(`[verifyDIDStatus] DIDSet check failed on ${endpoint}:`, err.message);
        continue;
      }
    }

    return { success: false, hasDIDSet: false };
  };

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { isVerified: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse wallet_id from request body
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const requestedWalletId = body.wallet_id;

    let wallet;
    if (requestedWalletId) {
      // Fetch the specific wallet requested
      const userWallets = await base44.asServiceRole.entities.Wallet.filter(
        { owner_id: user.id },
        '-updated_date',
        100
      );
      wallet = userWallets.find(w => w.id === requestedWalletId);

      // Admin can verify any wallet
      if (!wallet && user.role === 'admin') {
        const allWallets = await base44.asServiceRole.entities.Wallet.list('-updated_date', 200);
        wallet = allWallets.find(w => w.id === requestedWalletId);
      }
    } else {
      // Fallback: get user's first wallet
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { owner_id: user.id },
        '-updated_date',
        1
      );
      wallet = wallets?.[0];
    }

    if (!wallet) {
      return Response.json({
        isVerified: false,
        error: requestedWalletId ? `Wallet ${requestedWalletId} not found or not accessible` : 'No wallet found',
        verification: {
          account_exists: false,
          did_active: false
        }
      });
    }

    const classicAddress = wallet.classic_address;
    const network = wallet.network || 'mainnet';

    // Check if account exists on XRPL
    const xrplResult = await queryXRPL(classicAddress, network);

    if (!xrplResult.success) {
      return Response.json({
        isVerified: false,
        error: `Failed to query XRPL: ${xrplResult.error}`,
        verification: {
          account_exists: false,
          did_active: false
        },
        network: network,
        did: `did:xrpl:${classicAddress}`
      });
    }

    const accountData = xrplResult.data;
    const accountExists = !!accountData;

    // Check if DIDSet transaction exists
    const didCheckResult = await checkDIDSetExists(classicAddress, network);
    const didActive = didCheckResult.success && didCheckResult.hasDIDSet;

    // Update database if publication status changed
    if (wallet.is_published !== didActive && accountExists) {
      try {
        await base44.asServiceRole.entities.Wallet.update(wallet.id, {
          is_published: didActive
        });
      } catch (updateErr) {
        console.error('[verifyDIDStatus] Failed to update wallet:', updateErr);
      }
    }

    // Fetch linked agent
    const agents = await base44.asServiceRole.entities.Agent.filter(
      { classic_address: classicAddress },
      '',
      1
    );
    const agent = agents?.[0];

    // Calculate live balance from on-chain data
    const liveBalance = accountExists ? parseFloat((parseInt(accountData.Balance) / 1_000_000).toFixed(6)) : 0;

    // Update stored balance to match on-chain reality
    if (accountExists && Math.abs(liveBalance - (wallet.balance || 0)) > 0.001) {
      try {
        await base44.asServiceRole.entities.Wallet.update(wallet.id, {
          balance: liveBalance
        });
      } catch (e) {
        console.warn('[verifyDIDStatus] Balance sync failed:', e.message);
      }
    }

    return Response.json({
      isVerified: didActive,
      userId: user.id,
      email: user.email,
      did: `did:xrpl:${classicAddress}`,
      classic_address: classicAddress,
      walletId: wallet.id,
      network: network,
      verification: {
        verified: didActive,
        account_exists: accountExists,
        did_active: didActive,
        verified_at: new Date().toISOString(),
        balance: liveBalance.toFixed(2) + ' XRP',
        on_chain_proof: accountExists ? {
          account: classicAddress,
          ledger_sequence: accountData.index || accountData.LedgerIndex || 'N/A',
          previous_txn: accountData.PreviousTxnID || null,
          previous_txn_ledger: accountData.PreviousTxnLgrSeq || null,
          validated: true,
          explorer_url: `https://xrpscan.com/account/${classicAddress}`
        } : null
      },
      agentId: agent?.id || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[verifyDIDStatus] Error:', error);
    return Response.json(
      {
        isVerified: false,
        error: error.message || 'Internal server error',
        verification: {
          account_exists: false,
          did_active: false
        }
      },
      { status: 500 }
    );
  }
});
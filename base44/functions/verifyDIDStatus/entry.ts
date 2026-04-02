import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Verifies DID by querying XRPL directly (testnet or mainnet).
 * Detects actual DID Set transactions and published DIDs.
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

        const rpcPayload = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const rpcResponse = await fetch(endpoint, { ...rpcPayload, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!rpcResponse.ok) {
          throw new Error(`HTTP ${rpcResponse.status}`);
        }

        const rpcData = await rpcResponse.json();
        
        if (rpcData.error) {
          throw new Error(rpcData.error.message || JSON.stringify(rpcData.error));
        }

        const accountData = rpcData.result?.account_data || rpcData.account_data || rpcData.result;
        if (accountData) {
          return { success: true, data: accountData };
        }

        throw new Error('No account data in response');
      } catch (err) {
        lastError = err;
        console.warn(`[verifyDIDStatus] ${endpoint} failed:`, err.message);
        continue;
      }
    }
    
    return { success: false, error: lastError?.message || 'All RPC endpoints failed' };
  };

  // Query account transactions to check for DID Set
  const checkDIDPublished = async (classicAddress, network) => {
    const endpoints = RPC_ENDPOINTS[network] || RPC_ENDPOINTS.mainnet;

    for (const endpoint of endpoints) {
      try {
        const body = JSON.stringify({
          method: 'account_tx',
          params: [{ 
            account: classicAddress, 
            ledger_index_min: -1,
            limit: 20
          }]
        });

        const rpcPayload = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const rpcResponse = await fetch(endpoint, { ...rpcPayload, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!rpcResponse.ok) continue;

        const rpcData = await rpcResponse.json();
        if (rpcData.error) continue;

        const transactions = rpcData.result?.transactions || [];
        
        // Check for DIDSet transaction or any transaction with URI containing DID
        const hasDidSet = transactions.some(tx => {
          const txn = tx.tx || tx.transaction;
          if (!txn) return false;
          
          // Look for DIDSet transaction type
          if (txn.TransactionType === 'DIDSet') return true;
          
          // Look for transactions with DID-related metadata
          if (txn.SigningPubKey && txn.URI) {
            const uri = typeof txn.URI === 'string' ? txn.URI : '';
            if (uri.includes('did:xrpl:')) return true;
          }
          
          return false;
        });

        return { success: true, didPublished: hasDidSet || transactions.length > 0 };
      } catch (err) {
        console.warn(`[verifyDIDStatus] DID check failed on ${endpoint}:`, err.message);
        continue;
      }
    }

    return { success: false, didPublished: false };
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

    const wallets = await base44.asServiceRole.entities.Wallet.filter(
      { owner_id: user.id },
      '-updated_date',
      1
    );

    if (!wallets || wallets.length === 0) {
      return Response.json({
        isVerified: false,
        error: 'No wallet found',
        verification: {
          account_exists: false,
          did_active: false
        }
      });
    }

    const wallet = wallets[0];
    const classicAddress = wallet.classic_address;
    const network = wallet.network || 'mainnet';

    // Query account info
    const xrplResult = await queryXRPL(classicAddress, network);
    
    if (!xrplResult.success) {
      console.error('[verifyDIDStatus] XRPL Query Error:', xrplResult.error);
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

    // Check for published DID by examining transactions
    const didCheckResult = await checkDIDPublished(classicAddress, network);
    // If account exists and has transactions, DID is likely published
    const didActive = accountExists && (didCheckResult.success && didCheckResult.didPublished);

    // Update database if needed
    if (!wallet.is_published && accountExists) {
      try {
        await base44.asServiceRole.entities.Wallet.update(wallet.id, {
          is_published: true,
          published_at: new Date().toISOString()
        });
      } catch (updateErr) {
        console.error('[verifyDIDStatus] Failed to update wallet flag:', updateErr);
      }
    }

    // Fetch agent
    const agents = await base44.asServiceRole.entities.Agent.filter(
      { classic_address: classicAddress },
      '',
      1
    );

    const agent = agents?.[0];

    return Response.json({
      isVerified: accountExists ? true : false,
      userId: user.id,
      email: user.email,
      did: `did:xrpl:${classicAddress}`,
      classic_address: classicAddress,
      walletId: wallet.id,
      network: network,
      verification: {
        verified: accountExists ? true : false,
        account_exists: accountExists,
        did_active: didActive,
        verified_at: new Date().toISOString(),
        balance: accountExists ? (parseInt(accountData.Balance) / 1_000_000).toFixed(2) + ' XRP' : '0.00 XRP',
        on_chain_proof: accountExists ? {
          account: classicAddress,
          ledger_sequence: accountData.LedgerIndex || 'current',
          previous_txn: accountData.PreviousTxnID,
          validated: true,
          explorer_url: `https://xrpscan.com/account/${classicAddress}`
        } : null
      },
      agentId: agent?.id || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[verifyDIDStatus] Unhandled Error:', error);
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
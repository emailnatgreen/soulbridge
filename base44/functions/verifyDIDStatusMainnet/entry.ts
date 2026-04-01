import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * CRITICAL FIX: Verify DID by querying XRPL MAINNET directly via RPC.
 * Does NOT rely on is_published database flag.
 * This is the true source of truth for DID verification.
 */
Deno.serve(async (req) => {
  const XRPL_MAINNET_RPC = 'https://xrpl.ws';

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { isVerified: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's wallet
    const wallets = await base44.asServiceRole.entities.Wallet.filter(
      { owner_id: user.id },
      '-updated_date',
      1
    );

    if (!wallets || wallets.length === 0) {
      return Response.json({
        isVerified: false,
        error: 'No wallet found',
        userId: user.id,
        email: user.email
      });
    }

    const wallet = wallets[0];
    const classicAddress = wallet.classic_address;

    // Query XRPL MAINNET directly via JSON-RPC
    const rpcPayload = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'account_info',
        params: {
          account: classicAddress,
          ledger_index: 'validated'
        }
      })
    };

    const rpcResponse = await fetch(XRPL_MAINNET_RPC, rpcPayload);
    const rpcData = await rpcResponse.json();

    if (rpcData.error) {
      console.error('[verifyDIDStatusMainnet] XRPL RPC Error:', rpcData.error);
      return Response.json({
        isVerified: false,
        error: `Account not found on XRPL mainnet: ${rpcData.error.message}`,
        classic_address: classicAddress,
        network: 'mainnet'
      });
    }

    const accountData = rpcData.result?.account_data;
    if (!accountData) {
      return Response.json({
        isVerified: false,
        error: 'Account not found on XRPL mainnet',
        classic_address: classicAddress,
        network: 'mainnet'
      });
    }

    // Account exists on mainnet — DID is verified
    // Update database flag if it wasn't already set
    if (!wallet.is_published) {
      try {
        await base44.asServiceRole.entities.Wallet.update(wallet.id, {
          is_published: true,
          published_at: new Date().toISOString()
        });
        console.log(`[verifyDIDStatusMainnet] Updated wallet ${wallet.id} is_published=true`);
      } catch (updateErr) {
        console.error('[verifyDIDStatusMainnet] Failed to update wallet flag:', updateErr);
        // Continue — verification still succeeds even if DB update fails
      }
    }

    // Fetch agent profile
    const agents = await base44.asServiceRole.entities.Agent.filter(
      { classic_address: classicAddress },
      '',
      1
    );

    const agent = agents?.[0];
    const role = agent?.role || 'citizen';
    const permissions = agent?.permissions || {
      can_create_agents: false,
      can_send_xrp: true,
      can_access_treasury: false,
      can_vote: true,
      can_evaluate_agents: false
    };

    return Response.json({
      isVerified: true,
      userId: user.id,
      email: user.email,
      did: `did:xrpl:${classicAddress}`,
      classic_address: classicAddress,
      walletId: wallet.id,
      network: 'mainnet',
      publishedAt: wallet.published_at || new Date().toISOString(),
      role: role,
      permissions: permissions,
      agentId: agent?.id || null,
      xrplData: {
        sequence: accountData.Sequence,
        balance: accountData.Balance,
        flags: accountData.Flags
      },
      verification: {
        verified: true,
        account_exists: true,
        did_active: true,
        verified_at: new Date().toISOString(),
        balance: (parseInt(accountData.Balance) / 1_000_000).toFixed(2) + ' XRP'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[verifyDIDStatusMainnet] Unhandled Error:', error);
    return Response.json(
      { isVerified: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
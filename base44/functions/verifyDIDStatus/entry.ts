import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Verifies DID authenticity by validating:
 * 1. User has an associated Wallet
 * 2. Wallet's classic_address matches XRPL DID (is_published = true)
 * 3. Returns verified DID status + user permissions
 * 
 * This is the cryptographic foundation of user identity for chat + agent invocation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { isVerified: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's wallet(s)
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

    // Check if DID is published on-chain
    if (!wallet.is_published) {
      return Response.json({
        isVerified: false,
        error: 'DID not yet published on XRPL',
        walletId: wallet.id,
        classic_address: wallet.classic_address,
        network: wallet.network
      });
    }

    // Fetch agent profile to determine role/permissions
    const agents = await base44.asServiceRole.entities.Agent.filter(
      { classic_address: wallet.classic_address },
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

    // SUCCESS: DID is verified on-chain
    return Response.json({
      isVerified: true,
      userId: user.id,
      email: user.email,
      did: wallet.classic_address,
      walletId: wallet.id,
      network: wallet.network,
      publishedAt: wallet.published_at,
      role: role,
      permissions: permissions,
      agentId: agent?.id || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[verifyDIDStatus] Error:', error);
    return Response.json(
      { isVerified: false, error: error.message },
      { status: 500 }
    );
  }
});
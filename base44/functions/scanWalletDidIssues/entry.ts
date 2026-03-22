import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch wallets and related agents/DIDs
    const [wallets, agents] = await Promise.all([
      base44.asServiceRole.entities.Wallet.list('-created_date', 200),
      base44.asServiceRole.entities.Agent.list('-created_date', 200)
    ]);

    const issues = {
      unlinked: [],      // Wallets with no linked agent
      invalid_xrpl: [],  // Wallets that fail XRPL verification
      mismatched: [],    // Wallet address doesn't match agent's classic_address
      no_address: [],    // Wallets missing classic_address
      total_checked: wallets.length,
      checked_at: new Date().toISOString()
    };

    const agentMap = new Map(agents.map(a => [a.wallet_id, a]));

    for (const wallet of wallets) {
      try {
        // Check 1: Is wallet linked to an agent?
        const linkedAgent = agentMap.get(wallet.id);
        if (!linkedAgent) {
          issues.unlinked.push({
            wallet_id: wallet.id,
            owner_id: wallet.owner_id,
            name: wallet.name,
            network: wallet.network,
            address: wallet.classic_address
          });
          continue;
        }

        // Check 2: Does wallet have a classic address?
        if (!wallet.classic_address) {
          issues.no_address.push({
            wallet_id: wallet.id,
            owner_id: wallet.owner_id,
            agent_id: linkedAgent.id,
            agent_name: linkedAgent.name,
            network: wallet.network
          });
          continue;
        }

        // Check 3: Does agent's classic_address match wallet's?
        if (linkedAgent.classic_address && linkedAgent.classic_address !== wallet.classic_address) {
          issues.mismatched.push({
            wallet_id: wallet.id,
            owner_id: wallet.owner_id,
            agent_id: linkedAgent.id,
            agent_name: linkedAgent.name,
            wallet_address: wallet.classic_address,
            agent_address: linkedAgent.classic_address,
            network: wallet.network
          });
          continue;
        }

        // Check 4: Verify on XRPL
        const xrplUrl = wallet.network === 'mainnet'
          ? 'https://xrplcluster.com'
          : 'https://s.altnet.rippletest.net:51234';

        const response = await fetch(xrplUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'account_info',
            params: [{
              account: wallet.classic_address,
              ledger_index: 'validated'
            }]
          })
        });

        const result = await response.json();

        if (!result.result || !result.result.account_data) {
          issues.invalid_xrpl.push({
            wallet_id: wallet.id,
            owner_id: wallet.owner_id,
            agent_id: linkedAgent.id,
            agent_name: linkedAgent.name,
            address: wallet.classic_address,
            network: wallet.network,
            error: result.error?.message || 'Account not found on XRPL'
          });
        }

      } catch (error) {
        issues.invalid_xrpl.push({
          wallet_id: wallet.id,
          owner_id: wallet.owner_id,
          address: wallet.classic_address,
          network: wallet.network,
          error: `Verification error: ${error.message}`
        });
      }
    }

    return Response.json({
      summary: {
        total_checked: issues.total_checked,
        unlinked_count: issues.unlinked.length,
        invalid_xrpl_count: issues.invalid_xrpl.length,
        mismatched_count: issues.mismatched.length,
        no_address_count: issues.no_address.length
      },
      issues
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
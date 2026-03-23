import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { wallet_id, agent_id, approval_required } = body;

    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    // Fetch wallet
    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // If agent_id provided, fetch and verify agent
    let agent = null;
    if (agent_id) {
      agent = await base44.asServiceRole.entities.Agent.get(agent_id);
      if (!agent) {
        return Response.json({ error: 'Agent not found' }, { status: 404 });
      }
    }

    // Check if approval is required and pending
    if (approval_required) {
      return Response.json({
        status: 'approval_required',
        message: 'DID activation requires quad approval. Create a governance proposal.',
        wallet_id,
        agent_id
      });
    }

    const xrplUrl = wallet.network === 'mainnet'
      ? 'https://xrplcluster.com'
      : 'https://s.altnet.rippletest.net:51234';

    // Verify account exists on XRPL
    let accountResult = null;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      const accountResponse = await fetch(xrplUrl, {
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

      accountResult = await accountResponse.json();

      if (accountResult.error?.message?.includes('rate limit') || accountResponse.status === 429) {
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
      }
      break;
    }

    if (!accountResult.result || !accountResult.result.account_data) {
      return Response.json({
        error: 'Account does not exist on XRPL',
        message: accountResult.error?.message || 'Unable to verify account on ledger'
      }, { status: 400 });
    }

    const accountData = accountResult.result.account_data;

    // Create DID document object
    const didDocument = {
      id: `did:xrpl:${wallet.classic_address}`,
      publicKey: [{
        id: `did:xrpl:${wallet.classic_address}#keys-1`,
        type: 'EcdsaSecp256k1VerificationKey2019',
        controller: `did:xrpl:${wallet.classic_address}`,
        publicKeyPem: accountData.SigningPubKey || ''
      }],
      authentication: [
        `did:xrpl:${wallet.classic_address}#keys-1`
      ],
      proof: {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        verificationMethod: `did:xrpl:${wallet.classic_address}#keys-1`
      }
    };

    // Update wallet with DID activation status
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      did_document: didDocument,
      did_active: true,
      did_activated_at: new Date().toISOString()
    });

    // If agent linked, update agent DID status
    if (agent_id) {
      await base44.asServiceRole.entities.Agent.update(agent_id, {
        did_status: 'active',
        did_activated_at: new Date().toISOString()
      });
    }

    // Log the activation
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'DID Activation',
      function_name: 'activateDID',
      status: 'success',
      message: `DID activated for wallet ${wallet.name}${agent_id ? ` (Agent: ${agent?.name})` : ''}`,
      details: {
        wallet_id,
        agent_id,
        classic_address: wallet.classic_address,
        network: wallet.network,
        activated_at: new Date().toISOString()
      },
      run_at: new Date().toISOString(),
      triggered_by: 'manual'
    });

    return Response.json({
      status: 'success',
      message: 'DID activated successfully',
      wallet_id,
      agent_id,
      did: `did:xrpl:${wallet.classic_address}`,
      activated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
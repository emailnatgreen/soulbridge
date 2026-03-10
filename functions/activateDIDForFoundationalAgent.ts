import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can activate foundational agent DIDs
    if (user.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Only admins can activate foundational agent DIDs' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { agent_id, wallet_id } = body;

    if (!agent_id || !wallet_id) {
      return Response.json({ 
        error: 'agent_id and wallet_id are required' 
      }, { status: 400 });
    }

    // Fetch agent and validate it's a foundational agent
    const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
    
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const foundationalAgents = ['Axi', 'quad-node-1', 'quad-node-2', 'quad-node-3', 'quad-node-4'];
    
    if (!foundationalAgents.includes(agent.name)) {
      return Response.json({
        error: 'Agent is not a foundational agent',
        message: 'Only Axi and quad nodes can use this activation path'
      }, { status: 403 });
    }

    // Fetch wallet
    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Verify account exists on XRPL
    const xrplUrl = wallet.network === 'mainnet'
      ? 'https://xrplcluster.com'
      : 'https://s.altnet.rippletest.net:51234';

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

    // Create DID document
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
        verificationMethod: `did:xrpl:${wallet.classic_address}#keys-1`,
        signatureValue: 'system-bootstrap'
      }
    };

    // Update wallet with DID activation
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      did_document: didDocument,
      did_active: true,
      did_activated_at: new Date().toISOString(),
      did_activation_type: 'foundational'
    });

    // Update agent DID status
    await base44.asServiceRole.entities.Agent.update(agent_id, {
      did_status: 'active',
      did_activated_at: new Date().toISOString(),
      did_activation_type: 'foundational'
    });

    // Log foundational activation (different from governance-approved)
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Foundational Agent DID Activation',
      function_name: 'activateDIDForFoundationalAgent',
      status: 'success',
      message: `Foundational DID activated for ${agent.name}`,
      details: {
        agent_id,
        agent_name: agent.name,
        wallet_id,
        classic_address: wallet.classic_address,
        network: wallet.network,
        activation_type: 'foundational',
        activated_by: user.email,
        activated_at: new Date().toISOString()
      },
      run_at: new Date().toISOString(),
      triggered_by: 'manual'
    });

    return Response.json({
      status: 'success',
      message: `Foundational DID activated for ${agent.name}`,
      agent_id,
      agent_name: agent.name,
      wallet_id,
      did: `did:xrpl:${wallet.classic_address}`,
      activation_type: 'foundational',
      activated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
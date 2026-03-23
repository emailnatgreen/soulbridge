import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classic_address, network } = await req.json();

    if (!classic_address) {
      return Response.json({ error: 'classic_address is required' }, { status: 400 });
    }

    const isTestnet = !network || network === 'testnet';
    const wsUrl = isTestnet
      ? 'wss://s.altnet.rippletest.net:51233'
      : 'wss://xrplcluster.com';

    // Use XRPL HTTP API instead of WebSocket for simplicity
    const rpcUrl = isTestnet
      ? 'https://s.altnet.rippletest.net:51234'
      : 'https://xrplcluster.com';

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_info',
        params: [{ account: classic_address, ledger_index: 'current' }],
      }),
    });

    const data = await response.json();

    if (data.result?.error === 'actNotFound') {
      return Response.json({
        verified: false,
        status: 'not_found',
        message: 'Address not found on XRPL. Fund this testnet wallet first.',
        classic_address,
        network: isTestnet ? 'testnet' : 'mainnet',
      });
    }

    if (data.result?.account_data) {
      const accountData = data.result.account_data;
      // Check for DID object on-chain
      const didResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'ledger_entry',
          params: [{ did: { account: classic_address }, ledger_index: 'current' }],
        }),
      });
      const didData = await didResponse.json();
      const didPublished = !didData.result?.error;

      return Response.json({
        verified: true,
        status: didPublished ? 'published' : 'active_not_published',
        message: didPublished
          ? 'DID is active and published on-chain!'
          : 'Wallet is active on XRPL but DID not yet published on-chain.',
        classic_address,
        network: isTestnet ? 'testnet' : 'mainnet',
        balance_xrp: accountData.Balance ? parseInt(accountData.Balance) / 1_000_000 : 0,
        did_published: didPublished,
        did_uri: didPublished ? `did:xrpl:${classic_address}` : null,
        ledger_sequence: data.result?.ledger_current_index,
      });
    }

    return Response.json({
      verified: false,
      status: 'error',
      message: 'Unexpected response from XRPL.',
      raw: data.result,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
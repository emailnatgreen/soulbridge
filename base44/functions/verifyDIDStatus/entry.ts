import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    let classic_address = body.classic_address;
    let network = body.network || 'testnet';

    // Support wallet_id lookup
    if (!classic_address && body.wallet_id) {
      const wallet = await base44.entities.Wallet.get(body.wallet_id);
      if (!wallet) {
        return Response.json({ error: 'Wallet not found' }, { status: 404 });
      }
      classic_address = wallet.classic_address;
      network = wallet.network || 'testnet';
    }

    if (!classic_address) {
      return Response.json({ error: 'classic_address or wallet_id is required' }, { status: 400 });
    }

    const isTestnet = network === 'testnet';
    const rpcUrl = isTestnet
      ? 'https://testnet.xrpl-labs.com'
      : 'https://xrplcluster.com';

    const accountRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_info',
        params: [{ account: classic_address, ledger_index: 'current' }],
      }),
    });
    const accountData = await accountRes.json();

    if (accountData.result?.error === 'actNotFound') {
      return Response.json({
        did: `did:xrpl:${classic_address}`,
        network: isTestnet ? 'testnet' : 'mainnet',
        verification: {
          account_exists: false,
          did_active: false,
          verified_at: new Date().toISOString(),
          message: 'Address not found on XRPL. Fund this testnet wallet first at https://faucet.altnet.rippletest.net/',
        }
      });
    }

    const balance = accountData.result?.account_data?.Balance
      ? parseInt(accountData.result.account_data.Balance) / 1_000_000
      : 0;

    // Check for DID object on-chain
    const didRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'ledger_entry',
        params: [{ did: { account: classic_address }, ledger_index: 'current' }],
      }),
    });
    const didData = await didRes.json();
    const didPublished = !didData.result?.error;
    const didNode = didData.result?.node;

    return Response.json({
      did: `did:xrpl:${classic_address}`,
      network: isTestnet ? 'testnet' : 'mainnet',
      verification: {
        account_exists: true,
        did_active: didPublished,
        balance: balance,
        verified_at: new Date().toISOString(),
        message: didPublished
          ? 'DID is active and published on-chain!'
          : 'Wallet is active on XRPL but DID not yet published on-chain. Use "Publish DID On-Chain" to publish.',
      },
      did_data: didPublished && didNode ? {
        uri: didNode.URI ? new TextDecoder().decode(new Uint8Array(didNode.URI.match(/.{1,2}/g).map(b => parseInt(b, 16)))) : null,
        document: didNode.DIDDocument || null,
        data: didNode.Data || null,
      } : null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
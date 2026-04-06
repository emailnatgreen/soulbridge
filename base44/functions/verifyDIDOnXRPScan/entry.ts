import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_address } = await req.json();
    
    if (!wallet_address) {
      return Response.json({ error: 'wallet_address required' }, { status: 400 });
    }

    // Query XRPSCAN for DID verification
    const xrpscanResponse = await fetch(
      `https://xrpscan.com/api/v1/account/${wallet_address}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!xrpscanResponse.ok) {
      return Response.json({ error: 'XRPSCAN lookup failed' }, { status: 404 });
    }

    const accountData = await xrpscanResponse.json();

    // Check for DID objects
    const didResponse = await fetch(
      `https://xrpscan.com/api/v1/account/${wallet_address}/nfts?type=DID`,
      { headers: { 'Accept': 'application/json' } }
    ).catch(() => null);

    const dids = didResponse?.ok ? await didResponse.json() : [];

    return Response.json({
      verified: true,
      account: accountData,
      dids: dids,
      has_did: dids.length > 0,
      xrpscan_url: `https://xrpscan.com/${wallet_address}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
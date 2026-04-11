import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { account } = await req.json();

    const res = await fetch('https://xrplcluster.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_objects',
        params: [{
          account: account || 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',
          type: 'signer_list'
        }]
      })
    });

    const data = await res.json();
    const signerList = data?.result?.account_objects?.[0];

    if (!signerList) {
      return Response.json({ 
        has_signer_list: false, 
        message: 'No signer list found on this account',
        raw: data?.result 
      });
    }

    return Response.json({
      has_signer_list: true,
      quorum: signerList.SignerQuorum,
      signers: signerList.SignerEntries?.map(e => ({
        account: e.SignerEntry.Account,
        weight: e.SignerEntry.SignerWeight
      })),
      raw: signerList
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
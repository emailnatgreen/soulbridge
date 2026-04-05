import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload_id } = await req.json();
    if (!payload_id) return Response.json({ error: 'payload_id required' }, { status: 400 });

    const apiKey = Deno.env.get('xumm_api_key');
    const apiSecret = Deno.env.get('xume_secret_key');

    const res = await fetch(`https://xaman.app/api/v1/platform/payload/${payload_id}`, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
    });

    const data = await res.json();

    const resolved = data?.meta?.resolved ?? false;
    const signed = data?.meta?.signed ?? false;
    const expired = data?.meta?.expired ?? false;
    const cancelled = data?.meta?.cancelled ?? false;
    const txid = data?.response?.txid ?? null;
    const account = data?.response?.account ?? null;
    let dispatched = data?.response?.dispatched_result ?? null;

    console.log('Swap status check:', { resolved, signed, expired, cancelled, txid, dispatched });

    // If signed with a txid but dispatched_result is empty/null, check XRPL directly
    if (signed && txid && (!dispatched || dispatched === '')) {
      console.log('Empty dispatched_result — checking XRPL ledger for tx:', txid);
      try {
        const txRes = await fetch('https://xrplcluster.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'tx', params: [{ transaction: txid }] }),
        });
        const txData = await txRes.json();
        const meta = txData?.result?.meta || txData?.result?.meta_blob;
        const txResult = typeof meta === 'object' ? meta.TransactionResult : null;
        if (txResult) {
          dispatched = txResult;
          console.log('XRPL tx result resolved:', txResult);
        } else if (txData?.result?.validated) {
          dispatched = 'tesSUCCESS';
          console.log('TX validated on ledger, assuming tesSUCCESS');
        } else {
          // TX submitted but not yet validated — treat as pending
          console.log('TX not yet validated on ledger, will retry');
        }
      } catch (e) {
        console.log('XRPL tx lookup failed:', e.message);
      }
    }

    // If signed and successful, log it
    // Log signed swaps — successful or failed dispatch
    if (signed && txid) {
      const isSuccess = dispatched === 'tesSUCCESS';
      console.log(`Swap ${isSuccess ? 'succeeded' : 'dispatched: ' + dispatched}`, { txid });

      if (isSuccess) {
      await base44.asServiceRole.entities.Transaction.create({
        recipient_address: account || 'DEX',
        recipient_name: `DEX Swap (${swapMeta.direction === 'xrp_to_rlusd' ? 'XRP→RLUSD' : 'RLUSD→XRP'})`,
        amount: swapMeta.gross_amount || 0,
        note: `DEX swap via Xumm. Fee: ${swapMeta.fee_amount?.toFixed(6) || '0'} (${swapMeta.fee_percent || 1}%)`,
        status: 'completed',
        hash: txid,
      });
      }
    }

    return Response.json({
      resolved,
      signed,
      expired,
      cancelled,
      txid,
      account,
      dispatched_result: dispatched,
      success: signed && (dispatched === 'tesSUCCESS' || (txid && (!dispatched || dispatched === ''))),
    });
  } catch (error) {
    console.error('checkDexSwapStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
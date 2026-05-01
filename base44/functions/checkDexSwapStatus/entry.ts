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

    // Parse swap metadata from custom_meta blob (set during prepareDexSwap)
    let swapMeta = {};
    try {
      const blobStr = data?.payload?.custom_meta?.blob;
      if (blobStr) swapMeta = JSON.parse(blobStr);
    } catch (_) { /* ignore parse errors */ }

    console.log('Swap status check:', { resolved, signed, expired, cancelled, txid, dispatched });

    // If signed with a txid but dispatched_result is empty/null, check XRPL directly
    // Retry up to 3 times with a short delay to allow ledger validation
    if (signed && txid && (!dispatched || dispatched === '')) {
      console.log('Empty dispatched_result — checking XRPL ledger for tx:', txid);
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
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
            break;
          } else if (txData?.result?.validated) {
            dispatched = 'tesSUCCESS';
            console.log('TX validated on ledger, assuming tesSUCCESS');
            break;
          } else {
            console.log(`TX not yet validated (attempt ${attempt + 1}/3)`);
          }
        } catch (e) {
          console.log('XRPL tx lookup failed:', e.message);
        }
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

    // If signed with txid but no dispatched result yet, tell frontend to keep polling
    const pendingValidation = signed && txid && (!dispatched || dispatched === '');
    const isSuccess = signed && dispatched === 'tesSUCCESS';

    return Response.json({
      resolved: pendingValidation ? false : resolved,
      signed,
      expired,
      cancelled,
      txid,
      account,
      dispatched_result: dispatched,
      success: isSuccess,
      pending_validation: pendingValidation,
    });
  } catch (error) {
    console.error('checkDexSwapStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
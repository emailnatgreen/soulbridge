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
    const dispatched = data?.response?.dispatched_result ?? null;

    // If signed and successful, log it
    if (signed && txid && dispatched === 'tesSUCCESS') {
      const blobStr = data?.payload?.custom_meta?.blob;
      let swapMeta = {};
      try { swapMeta = JSON.parse(blobStr); } catch (_) {}

      await base44.asServiceRole.entities.Transaction.create({
        recipient_address: account || 'DEX',
        recipient_name: `DEX Swap (${swapMeta.direction === 'xrp_to_rlusd' ? 'XRP→RLUSD' : 'RLUSD→XRP'})`,
        amount: swapMeta.gross_amount || 0,
        note: `DEX swap via Xumm. Fee: ${swapMeta.fee_amount?.toFixed(6) || '0'} (${swapMeta.fee_percent || 1}%)`,
        status: 'completed',
        hash: txid,
      });
    }

    return Response.json({
      resolved,
      signed,
      expired,
      cancelled,
      txid,
      account,
      dispatched_result: dispatched,
      success: signed && dispatched === 'tesSUCCESS',
    });
  } catch (error) {
    console.error('checkDexSwapStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
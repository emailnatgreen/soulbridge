import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('xumm_api_key');
    const apiSecret = Deno.env.get('xume_secret_key');

    const payload = {
      txjson: {
        TransactionType: 'SignIn',
      },
      options: {
        submit: false,
        expire: 5, // minutes
      },
      custom_meta: {
        instruction: 'Sign in to import your XRPL wallet address into SoulBridge Village',
      },
    };

    const res = await fetch('https://xaman.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data?.uuid) {
      return Response.json({ error: 'XUMM payload creation failed', detail: data }, { status: 500 });
    }

    return Response.json({
      payload_id: data.uuid,
      qr_png: data.refs?.qr_png,
      deeplink: data.next?.always,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
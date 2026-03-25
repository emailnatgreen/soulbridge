import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    const expired = data?.meta?.expired ?? false;
    const account = data?.response?.account ?? null;

    return Response.json({ resolved, expired, account });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
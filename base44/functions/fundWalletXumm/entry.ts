import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { classic_address, amount } = await req.json();
        if (!classic_address) return Response.json({ error: 'classic_address required' }, { status: 400 });

        const fundAmount = amount || 10;

        const xummApiKey = Deno.env.get('xumm_api_key');
        const xummApiSecret = Deno.env.get('xume_secret_key');

        if (!xummApiKey || !xummApiSecret) {
            return Response.json({ error: 'Xumm API keys not configured' }, { status: 500 });
        }

        const payload = {
            txjson: {
                TransactionType: 'Payment',
                Destination: classic_address,
                Amount: String(fundAmount * 1_000_000), // drops
            },
            options: {
                submit: true,
                return_url: {
                    web: `${req.headers.get('origin') || 'https://app.base44.com'}/dashboard`,
                },
            },
        };

        const res = await fetch('https://xaman.app/api/v1/platform/payload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': xummApiKey,
                'X-API-Secret': xummApiSecret,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data?.refs?.qr_png) {
            return Response.json({ error: data?.error?.reference || 'Failed to create Xumm payload' }, { status: 500 });
        }

        return Response.json({
            success: true,
            qr_png: data.refs.qr_png,
            qr_link: data.next?.always,
            uuid: data.uuid,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
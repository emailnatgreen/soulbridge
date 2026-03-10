import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('xumm_api_key');
    const apiSecret = Deno.env.get('xume_secret_key');
    
    if (!apiKey || !apiSecret) {
      return Response.json({ error: 'XUMM credentials not configured' }, { status: 500 });
    }

    const { tool, params } = await req.json();

    if (tool === 'create_did') {
      const { address, name, profileUrl, instruction } = params;

      const txjson = {
        TransactionType: "Payment",
        Account: address,
        Destination: address,
        Amount: "1",
        Fee: "12"
      };

      const basicAuth = btoa(`${apiKey}:${apiSecret}`);
      const xamanRes = await fetch('https://xumm.app/api/v1/platform/payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`
        },
        body: JSON.stringify({ txjson })
      });

      const data = await xamanRes.json();

      if (!xamanRes.ok || !data.uuid) {
        console.error('XUMM Error:', data);
        return Response.json({ error: `XUMM failed: ${data.error?.code || 'Unknown'}` }, { status: 500 });
      }

      return Response.json({
        success: true,
        result: {
          uuid: data.uuid,
          qr: data.refs.qrpng,
          qr_png: data.refs.qrpng,
          expires: data.payload.expires_at
        }
      });

    } else if (tool === 'check_status') {
      const { uuid } = params;
      const basicAuth = btoa(`${apiKey}:${apiSecret}`);
      const xamanRes = await fetch(`https://xumm.app/api/v1/platform/payload/${uuid}`, {
        headers: {
          'Authorization': `Basic ${basicAuth}`
        }
      });

      const status = await xamanRes.json();

      return Response.json({
        success: true,
        result: {
          signed: status.payload.response?.signed ?? false,
          resolved: status.payload.response ? true : false,
          transaction: status.payload.response?.txn_type === 'SigningResult' ? status.payload.response?.tx_json?.hash : null,
          account: status.payload.response?.account || null
        }
      });

    } else {
      return Response.json({ error: 'Unknown tool' }, { status: 400 });
    }

  } catch (error) {
    console.error('mcp error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
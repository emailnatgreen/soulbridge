import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
        TransactionType: "SignIn"
      };

      const xamanRes = await fetch('https://xaman.app/api/v1/platform/payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret
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
          qr: data.refs?.qr_png,
          qr_png: data.refs?.qr_png,
          deeplink: data.next?.always || null,
          expires: data.payload?.expires_at || null
        }
      });

    } else if (tool === 'check_status') {
      const { uuid } = params;
      const xamanRes = await fetch(`https://xaman.app/api/v1/platform/payload/${uuid}`, {
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret
        }
      });

      const status = await xamanRes.json();

      return Response.json({
        success: true,
        result: {
          signed: status.response?.dispatched_result === 'tesSUCCESS' || status.meta?.resolved === true && !!status.response?.txid,
          resolved: status.meta?.resolved ?? false,
          transaction: status.response?.txid || null,
          account: status.response?.account || null
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
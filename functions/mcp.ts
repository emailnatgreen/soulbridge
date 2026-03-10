import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tool, params } = await req.json();

    if (tool === 'create_did') {
      const { address, name, profileUrl, instruction } = params;

      // Create XUMM payload via HTTP call to XUMM API
      const apiKey = Deno.env.get('XUMM_API_KEY');
      const apiSecret = Deno.env.get('XUMM_API_SECRET');
      
      if (!apiKey || !apiSecret) {
        return Response.json({ error: 'XUMM credentials not configured' }, { status: 500 });
      }

      // Simple AccountSet transaction to mark DID creation
      const payload = {
        TransactionType: "AccountSet",
        Account: address,
        Fee: "12"
      };

      const basicAuth = btoa(`${apiKey}:${apiSecret}`);
      const xamanRes = await fetch('https://xumm.app/api/v1/platform/payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'X-API-Version': '3'
        },
        body: JSON.stringify({ txjson: payload })
      });

      if (!xamanRes.ok) {
        const error = await xamanRes.text();
        return Response.json({ error: `XUMM API error: ${error}` }, { status: 500 });
      }

      const xamanData = await xamanRes.json();

      return Response.json({
        success: true,
        result: {
          uuid: xamanData.uuid,
          qr: xamanData.refs.qrpng,
          qr_png: xamanData.refs.qrpng,
          expires: xamanData.payload.expires_at
        }
      });

    } else if (tool === 'check_status') {
      const { uuid } = params;
      const apiKey = Deno.env.get('XUMM_API_KEY');
      const apiSecret = Deno.env.get('XUMM_API_SECRET');
      
      if (!apiKey || !apiSecret) {
        return Response.json({ error: 'XUMM credentials not configured' }, { status: 500 });
      }

      const basicAuth = btoa(`${apiKey}:${apiSecret}`);
      const xamanRes = await fetch(`https://xumm.app/api/v1/platform/payload/${uuid}`, {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'X-API-Version': '3'
        }
      });

      if (!xamanRes.ok) {
        return Response.json({ error: 'Failed to check status' }, { status: 500 });
      }

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
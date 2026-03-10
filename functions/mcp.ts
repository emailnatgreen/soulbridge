import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { XummSdk } from 'npm:xumm-sdk@1.9.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('XUMM_API_KEY');
    const apiSecret = Deno.env.get('XUMM_API_SECRET');
    
    if (!apiKey || !apiSecret) {
      return Response.json({ error: 'XUMM credentials not configured' }, { status: 500 });
    }

    const xumm = new XummSdk(apiKey, apiSecret);
    const { tool, params } = await req.json();

    if (tool === 'create_did') {
      const { address, name, profileUrl, instruction } = params;

      const payload = {
        txjson: {
          TransactionType: "Payment",
          Account: address,
          Destination: address,
          Amount: "1",
          Fee: "12"
        }
      };

      const response = await xumm.payload(payload);
      
      if (!response.uuid) {
        return Response.json({ error: 'Failed to create payload' }, { status: 500 });
      }

      return Response.json({
        success: true,
        result: {
          uuid: response.uuid,
          qr: response.refs.qrpng,
          qr_png: response.refs.qrpng,
          expires: response.payload.expires_at
        }
      });

    } else if (tool === 'check_status') {
      const { uuid } = params;
      const status = await xumm.payload({ uuid });

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
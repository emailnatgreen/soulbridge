import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { widget_id } = await req.json();
    if (!widget_id) return Response.json({ error: 'widget_id required' }, { status: 400 });

    // Fetch the widget with its prepared mint payload
    const widget = await base44.asServiceRole.entities.Widget.get(widget_id);
    if (!widget) return Response.json({ error: 'Widget not found' }, { status: 404 });

    if (widget.mint_status !== 'prepared' && widget.mint_status !== 'simulated') {
      return Response.json({ 
        error: `Widget mint_status is '${widget.mint_status}', expected 'prepared' or 'simulated'. Run prepareMainnetMint first.` 
      }, { status: 400 });
    }

    const mintPayload = widget.xrpl_mint_payload;
    if (!mintPayload || !mintPayload.TransactionType) {
      return Response.json({ error: 'No valid xrpl_mint_payload found on widget' }, { status: 400 });
    }

    const xummApiKey = Deno.env.get('xumm_api_key');
    const xummApiSecret = Deno.env.get('xume_secret_key');
    if (!xummApiKey || !xummApiSecret) {
      return Response.json({ error: 'XUMM API keys not configured' }, { status: 500 });
    }

    // Strip internal _soulbridge_meta from the txjson before sending to Xaman
    const { _soulbridge_meta, ...txjson } = mintPayload;

    const payload = {
      txjson,
      options: {
        submit: true,
        expire: 15, // 15 minute window to sign
      },
      custom_meta: {
        instruction: `Mint NFT: "${widget.name}" on XRPL Mainnet`,
        blob: JSON.stringify({
          widget_id: widget.id,
          widget_name: widget.name,
          metadata_hash: widget.metadata_hash,
        }),
      },
    };

    console.log('[xummMintNFT] Sending payload to Xaman for widget:', widget.id, widget.name);

    const response = await fetch('https://xaman.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': xummApiKey,
        'X-API-Secret': xummApiSecret,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data?.uuid) {
      console.error('[xummMintNFT] Xaman payload creation failed:', JSON.stringify(data));
      return Response.json({ error: 'Xaman payload creation failed', details: data }, { status: 500 });
    }

    console.log('[xummMintNFT] Xaman payload created:', data.uuid);

    return Response.json({
      success: true,
      uuid: data.uuid,
      qr_png: data.refs?.qr_png,
      deeplink: data.next?.always,
      widget_id: widget.id,
      widget_name: widget.name,
      issuer_address: txjson.Account,
    });
  } catch (error) {
    console.error('[xummMintNFT] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
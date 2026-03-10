import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tool, params } = await req.json();

    if (tool === 'create_did') {
      // Import XUMM SDK for Xaman integration
      const { Xumm } = await import('npm:xumm-sdk@1.9.0');
      
      const apiKey = Deno.env.get('XUMM_API_KEY');
      const apiSecret = Deno.env.get('XUMM_API_SECRET');
      
      if (!apiKey || !apiSecret) {
        return Response.json({ error: 'XUMM credentials not configured' }, { status: 500 });
      }

      const xumm = new Xumm(apiKey, apiSecret);

      const { address, name, profileUrl, instruction } = params;

      // Create DID document
      const didDocument = {
        "@context": "https://www.w3.org/ns/did/v1",
        "id": `did:xrpl:${address}`,
        "alsoKnownAs": [name || address],
        "verificationMethod": [{
          "id": `did:xrpl:${address}#keys-1`,
          "type": "EcdsaSecp256k1VerificationKey2019",
          "controller": `did:xrpl:${address}`,
          "publicKeyBase58": address
        }],
        "service": [{
          "id": `did:xrpl:${address}#soulbridge`,
          "type": "SoulBridgeProfile",
          "serviceEndpoint": profileUrl || "https://soulbridge.base44.app",
          "description": instruction || "SoulBridge Village Citizen"
        }]
      };

      // Create transaction payload for Xaman
      const encoder = new TextEncoder();
      const didDocHex = Array.from(encoder.encode(JSON.stringify(didDocument)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      const dataHex = instruction 
        ? Array.from(encoder.encode(instruction))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
        : undefined;

      const payload = {
        TransactionType: "DIDSet",
        Account: address,
        URI: didDocHex,
        Data: dataHex,
        Fee: "12"
      };

      // Send to Xaman for signing
      const xamanResponse = await xumm.payload.post(payload);

      return Response.json({
        success: true,
        result: {
          uuid: xamanResponse.uuid,
          qr: xamanResponse.refs.qrpng,
          qr_png: xamanResponse.refs.qrpng,
          expires: xamanResponse.payload.expires_at
        }
      });

    } else if (tool === 'check_status') {
      const { Xumm } = await import('npm:xumm-sdk@1.9.0');
      
      const apiKey = Deno.env.get('XUMM_API_KEY');
      const apiSecret = Deno.env.get('XUMM_API_SECRET');
      
      if (!apiKey || !apiSecret) {
        return Response.json({ error: 'XUMM credentials not configured' }, { status: 500 });
      }

      const xumm = new Xumm(apiKey, apiSecret);
      const { uuid } = params;

      const status = await xumm.payload.get(uuid);

      return Response.json({
        success: true,
        result: {
          signed: status.payload.response?.txn_type === 'SigningResult' && status.payload.response?.signer_public_key ? true : false,
          resolved: status.payload.response ? true : false,
          transaction: status.payload.response?.tx_json?.hash || null,
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
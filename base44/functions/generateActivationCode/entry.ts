import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Generate Activation Code — called by DIDit after successful payment.
 * 
 * DIDit calls this endpoint in its delivery webhook.
 * Returns: { activation_code, widget_name, widget_nft_id, expires_at }
 * 
 * DIDit then emails the code to the buyer and shows it in their transaction history.
 * The buyer enters the code on their SoulBridge dashboard to unlock the NFT.
 * 
 * Payload:
 * {
 *   widget_nft_id: string,       // e.g. "WIDGET-CIT-001"
 *   buyer_email: string,         // buyer's email from DIDit
 *   buyer_did: string,           // optional DID
 *   didit_payment_id: string,    // DIDit's payment reference
 *   source: string,              // "didit_paypal" | "didit_rlusd"
 *   metadata: object             // optional extra context
 * }
 */

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SB-${segment()}-${segment()}-${segment()}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { widget_nft_id, buyer_email, buyer_did, didit_payment_id, source, metadata } = body;

    if (!widget_nft_id) {
      return Response.json({ error: 'widget_nft_id is required' }, { status: 400 });
    }

    // Look up the widget to get its name
    const widgets = await base44.asServiceRole.entities.Widget.filter({ nft_id: widget_nft_id }, '-created_date', 1);
    const widget = widgets?.[0];
    if (!widget) {
      return Response.json({ error: `Widget not found for nft_id: ${widget_nft_id}` }, { status: 404 });
    }

    // Generate a unique code (retry if collision)
    let code;
    let attempts = 0;
    while (attempts < 5) {
      code = generateCode();
      const existing = await base44.asServiceRole.entities.ActivationCode.filter({ code }, '-created_date', 1);
      if (!existing || existing.length === 0) break;
      attempts++;
    }

    // Set expiry to 90 days from now
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    // Create the activation code record
    const record = await base44.asServiceRole.entities.ActivationCode.create({
      code,
      widget_nft_id,
      widget_name: widget.name,
      source: source || 'didit_paypal',
      status: 'active',
      buyer_email: buyer_email || null,
      buyer_did: buyer_did || null,
      didit_payment_id: didit_payment_id || null,
      expires_at: expiresAt,
      metadata: metadata || null,
    });

    console.log(`[ActivationCode] Generated ${code} for ${widget.name} (${widget_nft_id}), buyer: ${buyer_email || 'unknown'}`);

    // Return the code to DIDit so it can email it to the buyer
    return Response.json({
      success: true,
      activation_code: code,
      widget_name: widget.name,
      widget_nft_id,
      expires_at: expiresAt,
      record_id: record.id,
    });
  } catch (error) {
    console.error('[ActivationCode] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
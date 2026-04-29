/**
 * purchaseWidgetNFT — Initiates an RLUSD payment via Xaman to purchase a Widget NFT
 * 
 * Actions:
 *   POST { action: "get_price", widget_id }
 *   POST { action: "initiate_payment", widget_id }
 *   POST { action: "check_payment", payload_uuid }
 *   POST { action: "confirm_purchase", widget_id, tx_hash }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // RLUSD hex
const RLUSD_ISSUER = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'; // Ripple's RLUSD issuer

function toHex(str) {
  return Array.from(new TextEncoder().encode(str)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { action } = body;

    // get_price and check_payment are read-only — allow without strict auth
    if (action === 'get_price') {
      return await handleGetPrice(base44, body);
    }
    if (action === 'check_payment') {
      return await handleCheckPayment(body);
    }

    // Authenticate — gracefully handle DID-only users
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    // For payment actions, we need at least a DID or email identifier
    const userIdentifier = user?.email || body.did || body.user_email || null;

    switch (action) {
      case 'initiate_payment':
        return await handleInitiatePayment(base44, userIdentifier, body);
      case 'confirm_purchase':
        return await handleConfirmPurchase(base44, userIdentifier, body);
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Get widget price
async function handleGetPrice(base44, body) {
  const { widget_id } = body;
  if (!widget_id) return Response.json({ error: 'widget_id required' }, { status: 400 });

  const widgets = await base44.asServiceRole.entities.Widget.filter({ id: widget_id });
  if (!widgets?.length) return Response.json({ error: 'Widget not found' }, { status: 404 });

  const widget = widgets[0];
  
  // Price is stored in cost_per_stream_interval for infrastructure NFTs (one-off purchase cost)
  // We need to look up the ResourceListing for the canonical price
  const listings = await base44.asServiceRole.entities.ResourceListing.filter(
    { resource_name: widget.name }, '-created_date', 5
  );
  
  let price = null;
  if (listings?.length) {
    const activeListing = listings.find(l => l.status === 'available') || listings[0];
    price = activeListing.price_rlusd || activeListing.unit_amount;
  }

  // Fallback: check known infrastructure prices
  if (!price) {
    const KNOWN_PRICES = {
      'WIDGET-WM-007': 60, 'WIDGET-WM-005': 12, 'WIDGET-TLG-001': 12,
      'WIDGET-SO-005': 50, 'WIDGET-WM-008': 20, 'WIDGET-AGN-001': 80,
      'WIDGET-SFU-001': 60, 'WIDGET-CSK-001': 80, 'WIDGET-AIN-001': 80,
    };
    price = KNOWN_PRICES[widget.nft_id] || null;
  }

  if (!price) return Response.json({ error: 'Price not available for this widget' }, { status: 400 });

  return Response.json({
    widget_id: widget.id,
    nft_id: widget.nft_id,
    name: widget.name,
    price_rlusd: price,
    treasury_address: TREASURY_ADDRESS,
    payment_method: 'RLUSD_ON_XRPL',
  });
}

// Initiate Xaman payment
async function handleInitiatePayment(base44, userIdentifier, body) {
  const { widget_id } = body;
  if (!widget_id) return Response.json({ error: 'widget_id required' }, { status: 400 });

  // Get price first
  const priceRes = await handleGetPrice(base44, body);
  const priceData = await priceRes.json();
  if (priceRes.status !== 200) return Response.json(priceData, { status: priceRes.status });

  const { price_rlusd, nft_id, name } = priceData;
  const buyerLabel = userIdentifier || 'anonymous';

  // Build XRPL Payment transaction for RLUSD
  const paymentTx = {
    TransactionType: 'Payment',
    Destination: TREASURY_ADDRESS,
    Amount: {
      currency: RLUSD_CURRENCY,
      value: String(price_rlusd),
      issuer: RLUSD_ISSUER,
    },
    Memos: [
      {
        Memo: {
          MemoType: toHex('soulbridge/nft-purchase'),
          MemoData: toHex(`${nft_id}|${name}|${buyerLabel}`),
        }
      }
    ],
  };

  // Create Xaman payload
  const xummApiKey = Deno.env.get('xumm_api_key');
  const xummSecret = Deno.env.get('xume_secret_key');

  const xummRes = await fetch('https://xumm.app/api/v1/platform/payload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': xummApiKey,
      'X-API-Secret': xummSecret,
    },
    body: JSON.stringify({
      txjson: paymentTx,
      options: {
        submit: true,
        return_url: { web: 'https://soulbridge.world/widget-marketplace' },
      },
      custom_meta: {
        identifier: `nft-${nft_id}-${Date.now()}`,
      },
    }),
  });

  const xummData = await xummRes.json();

  if (!xummRes.ok || !xummData.uuid) {
    console.error('Xaman error:', JSON.stringify(xummData));
    return Response.json({ error: 'Failed to create Xaman payment request', details: xummData }, { status: 500 });
  }

  return Response.json({
    success: true,
    payload_uuid: xummData.uuid,
    sign_url: xummData.next?.always || xummData.refs?.qr_uri_quality_opts?.[0],
    qr_url: xummData.refs?.qr_png,
    expires_at: xummData.refs?.expires_at,
    widget_id,
    nft_id,
    price_rlusd,
    treasury_address: TREASURY_ADDRESS,
  });
}

// Check Xaman payment status
async function handleCheckPayment(body) {
  const { payload_uuid } = body;
  if (!payload_uuid) return Response.json({ error: 'payload_uuid required' }, { status: 400 });

  const xummApiKey = Deno.env.get('xumm_api_key');
  const xummSecret = Deno.env.get('xume_secret_key');

  const res = await fetch(`https://xumm.app/api/v1/platform/payload/${payload_uuid}`, {
    headers: {
      'X-API-Key': xummApiKey,
      'X-API-Secret': xummSecret,
    },
  });

  const data = await res.json();

  return Response.json({
    resolved: data.meta?.resolved || false,
    signed: data.meta?.signed || false,
    cancelled: data.meta?.cancelled || false,
    expired: data.meta?.expired || false,
    tx_hash: data.response?.txid || null,
    dispatched_result: data.response?.dispatched_result || null,
    account: data.response?.account || null,
  });
}

// Confirm purchase after successful XRPL payment
async function handleConfirmPurchase(base44, userIdentifier, body) {
  const { widget_id, tx_hash } = body;
  if (!widget_id || !tx_hash) return Response.json({ error: 'widget_id and tx_hash required' }, { status: 400 });

  const buyerLabel = userIdentifier || body.did || 'anonymous';

  const widgets = await base44.asServiceRole.entities.Widget.filter({ id: widget_id });
  if (!widgets?.length) return Response.json({ error: 'Widget not found' }, { status: 404 });
  const widget = widgets[0];

  // Check for duplicate purchase
  const existingTxns = await base44.asServiceRole.entities.MarketplaceTransaction.filter(
    { nft_id: widget.nft_id, buyer_agent_id: buyerLabel, status: 'completed' }, '-created_date', 1
  );
  if (existingTxns?.length) {
    return Response.json({ error: 'You already own this NFT', code: 'ALREADY_OWNED' }, { status: 409 });
  }

  // Get price
  const priceRes = await handleGetPrice(base44, body);
  const priceData = await priceRes.json();
  const price = priceData.price_rlusd || 0;

  // Record the transaction
  const villageFee = Math.round(price * 0.01 * 100) / 100;
  const txn = await base44.asServiceRole.entities.MarketplaceTransaction.create({
    buyer_agent_id: buyerLabel,
    seller_agent_id: 'village_treasury',
    payment_method: 'RLUSD_ON_XRPL',
    unit_amount: price,
    purchase_price_rlusd: price,
    payment_reference: tx_hash,
    xrpl_transaction_hash: tx_hash,
    source: 'soulbridge',
    marketplace_type: 'widget',
    nft_id: widget.nft_id,
    resource_name: widget.name,
    status: 'completed',
    completion_date: new Date().toISOString(),
    distribution_details: {
      seller_receives_rlusd: price - villageFee,
      village_fee_rlusd: villageFee,
      treasury_fee_rlusd: villageFee,
    },
    metadata: {
      widget_id,
      nft_id: widget.nft_id,
      buyer_email: buyerLabel,
      payment_type: 'xaman_rlusd_direct',
      treasury_address: TREASURY_ADDRESS,
    },
  });

  // Log payment
  await base44.asServiceRole.entities.PaymentUsageLog.create({
    user_id: buyerLabel,
    user_email: buyerLabel,
    service_id: `nft-purchase-${widget.nft_id}`,
    amount: price,
    currency: 'RLUSD',
    pricing_model: 'flat',
    billing_behavior: 'prepay',
    status: 'success',
    metadata: {
      widget_id,
      nft_id: widget.nft_id,
      tx_hash,
      treasury_address: TREASURY_ADDRESS,
      purchase_type: 'xaman_rlusd_direct',
    },
  });

  return Response.json({
    success: true,
    transaction_id: txn.id,
    widget_id,
    nft_id: widget.nft_id,
    name: widget.name,
    price_rlusd: price,
    tx_hash,
    message: `Successfully purchased ${widget.name} for ${price} RLUSD`,
  });
}
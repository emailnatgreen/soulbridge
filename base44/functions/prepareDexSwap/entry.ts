import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
};

const TREASURY_ADDRESS = "rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h";
const VILLAGE_FEE_PERCENT = 1; // 1% per Law 6: Exchange

// Slippage tolerance — accept up to 5% worse than estimated rate
const SLIPPAGE_PERCENT = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { wallet_address, direction, amount } = await req.json();

    if (!wallet_address || !direction || !amount) {
      return Response.json({ error: 'wallet_address, direction, and amount are required' }, { status: 400 });
    }

    if (!['xrp_to_rlusd', 'rlusd_to_xrp'].includes(direction)) {
      return Response.json({ error: 'direction must be xrp_to_rlusd or rlusd_to_xrp' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Calculate the 1% village fee
    const feeAmount = numAmount * (VILLAGE_FEE_PERCENT / 100);
    const netAmount = numAmount - feeAmount;

    const apiKey = Deno.env.get('xumm_api_key');
    const apiSecret = Deno.env.get('xume_secret_key');

    if (!apiKey || !apiSecret) {
      return Response.json({ error: 'Xumm API keys not configured' }, { status: 500 });
    }

    // Fetch current XRP/RLUSD market rate from the XRPL DEX order book
    // For xrp_to_rlusd: we need offers where someone is SELLING RLUSD for XRP
    //   → book_offers where taker_gets=RLUSD, taker_pays=XRP (we consume these offers)
    // For rlusd_to_xrp: we need offers where someone is SELLING XRP for RLUSD
    //   → book_offers where taker_gets=XRP, taker_pays=RLUSD
    let rlusdPerXrp = 1.0; // How many RLUSD per 1 XRP
    try {
      // Always fetch the XRP→RLUSD book: offers selling RLUSD for XRP
      const bookRes = await fetch('https://xrplcluster.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'book_offers',
          params: [{
            taker_gets: { currency: RLUSD_CONFIG.currency, issuer: RLUSD_CONFIG.issuer },
            taker_pays: { currency: 'XRP' },
            limit: 10,
          }],
        }),
      });
      const bookData = await bookRes.json();
      const offers = bookData?.result?.offers || [];
      if (offers.length > 0) {
        const bestOffer = offers[0];
        // TakerPays = XRP (drops string), TakerGets = RLUSD (object with value)
        const xrpDrops = typeof bestOffer.TakerPays === 'string' ? parseFloat(bestOffer.TakerPays) : parseFloat(bestOffer.TakerPays.value || 0) * 1000000;
        const rlusdValue = typeof bestOffer.TakerGets === 'string' ? parseFloat(bestOffer.TakerGets) / 1000000 : parseFloat(bestOffer.TakerGets.value || 0);
        const xrpValue = xrpDrops / 1000000;
        if (xrpValue > 0 && rlusdValue > 0) {
          rlusdPerXrp = rlusdValue / xrpValue;
        }
      }
      console.log('DEX rate: 1 XRP =', rlusdPerXrp, 'RLUSD, offers found:', offers.length);
    } catch (e) {
      console.log('Could not fetch order book, using 1:1 fallback:', e.message);
    }

    // Build the OfferCreate transaction for the DEX swap
    // Flags: tfImmediateOrCancel (131072 / 0x00020000) + tfSell (524288 / 0x00080000) = 655360 / 0x000A0000
    // tfSell: ensure the full TakerGets is sold
    // tfImmediateOrCancel: unfilled portions cancel immediately — no resting offers
    const SWAP_FLAGS = 655360;
    let txjson;

    if (direction === 'xrp_to_rlusd') {
      // User sells XRP, wants RLUSD back
      const xrpToSellDrops = Math.floor(netAmount * 1000000).toString();
      // Minimum RLUSD to receive (with slippage)
      const minRlusd = (netAmount * rlusdPerXrp * (1 - SLIPPAGE_PERCENT / 100)).toFixed(6);

      txjson = {
        TransactionType: 'OfferCreate',
        Account: wallet_address,
        TakerPays: {
          currency: RLUSD_CONFIG.currency,
          issuer: RLUSD_CONFIG.issuer,
          value: minRlusd,
        },
        TakerGets: xrpToSellDrops,
        Flags: SWAP_FLAGS,
      };
    } else {
      // User sells RLUSD, wants XRP back
      const rlusdToSell = netAmount.toFixed(6);
      // Minimum XRP to receive (with slippage) in drops
      const minXrpDrops = Math.floor(netAmount / rlusdPerXrp * (1 - SLIPPAGE_PERCENT / 100) * 1000000).toString();

      txjson = {
        TransactionType: 'OfferCreate',
        Account: wallet_address,
        TakerPays: minXrpDrops,
        TakerGets: {
          currency: RLUSD_CONFIG.currency,
          issuer: RLUSD_CONFIG.issuer,
          value: rlusdToSell,
        },
        Flags: SWAP_FLAGS,
      };
    }

    console.log('Swap txjson:', JSON.stringify(txjson));

    // Create the Xumm payload for the swap
    const swapPayload = {
      txjson,
      options: {
        submit: true,
        expire: 10, // 10 minutes
      },
      custom_meta: {
        instruction: `SoulBridge DEX Swap: ${direction === 'xrp_to_rlusd' ? 'XRP → RLUSD' : 'RLUSD → XRP'}\nAmount: ${numAmount} (1% Village fee: ${feeAmount.toFixed(6)})\nSign with Xumm to execute.`,
        blob: JSON.stringify({
          type: 'dex_swap',
          direction,
          gross_amount: numAmount,
          net_amount: netAmount,
          fee_amount: feeAmount,
          fee_percent: VILLAGE_FEE_PERCENT,
          treasury: TREASURY_ADDRESS,
          estimated_rate: rlusdPerXrp,
        }),
      },
    };

    const res = await fetch('https://xaman.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
      body: JSON.stringify(swapPayload),
    });

    const data = await res.json();

    if (!data?.uuid) {
      console.error('Xumm payload creation failed:', JSON.stringify(data));
      return Response.json({ error: 'Failed to create Xumm signing payload', detail: data }, { status: 500 });
    }

    console.log('Xumm swap payload created:', data.uuid);

    // Log the swap attempt
    await base44.asServiceRole.entities.EconomicActivity.create({
      agent_id: 'dex_swap',
      activity_type: 'traded',
      amount: numAmount,
      description: `DEX swap initiated: ${direction === 'xrp_to_rlusd' ? 'XRP → RLUSD' : 'RLUSD → XRP'} for ${numAmount} (fee: ${feeAmount.toFixed(6)}, rate: ~${rlusdPerXrp.toFixed(4)} RLUSD/XRP)`,
      status: 'pending',
    });

    return Response.json({
      payload_id: data.uuid,
      qr_png: data.refs?.qr_png,
      deeplink: data.next?.always,
      xumm_url: data.next?.always,
      estimated_rate: rlusdPerXrp,
      fee_info: {
        gross_amount: numAmount,
        net_amount: netAmount,
        fee_amount: feeAmount,
        fee_percent: VILLAGE_FEE_PERCENT,
        treasury_address: TREASURY_ADDRESS,
      },
    });
  } catch (error) {
    console.error('prepareDexSwap error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
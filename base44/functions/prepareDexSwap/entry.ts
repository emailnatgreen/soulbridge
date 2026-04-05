import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
};

const TREASURY_ADDRESS = "rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h";
const VILLAGE_FEE_PERCENT = 1; // 1% per Law 6: Exchange

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

    // Build the OfferCreate transaction for the DEX swap
    // The user swaps netAmount (after fee), and we'll create a separate fee payment
    let txjson;

    if (direction === 'xrp_to_rlusd') {
      // User sells XRP, gets RLUSD
      // TakerPays = what the offer creator wants (RLUSD)
      // TakerGets = what the offer creator gives (XRP in drops)
      txjson = {
        TransactionType: 'OfferCreate',
        Account: wallet_address,
        TakerPays: {
          currency: RLUSD_CONFIG.currency,
          issuer: RLUSD_CONFIG.issuer,
          value: netAmount.toString(),
        },
        TakerGets: (netAmount * 1000000).toString(), // XRP in drops (1:1 approximate, DEX will find best rate)
        Flags: 0x00080000, // tfImmediateOrCancel — fill or kill, no lingering offers
      };
    } else {
      // User sells RLUSD, gets XRP
      // TakerPays = XRP in drops (what creator wants)
      // TakerGets = RLUSD (what creator gives)
      txjson = {
        TransactionType: 'OfferCreate',
        Account: wallet_address,
        TakerPays: (netAmount * 1000000).toString(), // XRP in drops
        TakerGets: {
          currency: RLUSD_CONFIG.currency,
          issuer: RLUSD_CONFIG.issuer,
          value: netAmount.toString(),
        },
        Flags: 0x00080000, // tfImmediateOrCancel
      };
    }

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
      console.error('Xumm payload creation failed:', data);
      return Response.json({ error: 'Failed to create Xumm signing payload', detail: data }, { status: 500 });
    }

    // Log the swap attempt
    await base44.asServiceRole.entities.EconomicActivity.create({
      agent_id: 'dex_swap',
      activity_type: 'traded',
      amount: numAmount,
      description: `DEX swap initiated: ${direction === 'xrp_to_rlusd' ? 'XRP → RLUSD' : 'RLUSD → XRP'} for ${numAmount} (fee: ${feeAmount.toFixed(6)})`,
      status: 'pending',
    });

    return Response.json({
      payload_id: data.uuid,
      qr_png: data.refs?.qr_png,
      deeplink: data.next?.always,
      xumm_url: data.next?.always,
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
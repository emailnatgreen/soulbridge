import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CG = 'https://api.coingecko.com/api/v3';
const FX_API = 'https://open.er-api.com/v6/latest/USD';

const SYMBOL_TO_CGID = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
  ADA: 'cardano', AVAX: 'avalanche-2', MATIC: 'matic-network',
  DOT: 'polkadot', LINK: 'chainlink', DOGE: 'dogecoin',
  BNB: 'binancecoin', LTC: 'litecoin', BCH: 'bitcoin-cash',
  ATOM: 'cosmos', UNI: 'uniswap', AAVE: 'aave', CRV: 'curve-dao-token',
  MKR: 'maker', COMP: 'compound-governance-token', SUSHI: 'sushi',
  FTM: 'fantom', NEAR: 'near', OP: 'optimism', ARB: 'arbitrum',
  INJ: 'injective-protocol', APT: 'aptos', SUI: 'sui',
  TON: 'the-open-network', PEPE: 'pepe', SHIB: 'shiba-inu',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled + authenticated calls
    try { await base44.auth.me(); } catch (_) { /* scheduled */ }

    const pairs = await base44.asServiceRole.entities.TradingPair.filter({ is_active: true });
    if (!pairs.length) return Response.json({ message: 'No active pairs', updated: 0 });

    const cryptoPairs = pairs.filter(p => p.asset_class === 'crypto' || p.asset_class === 'defi');
    const fxPairs = pairs.filter(p => p.asset_class === 'fx');
    const commodityPairs = pairs.filter(p => p.asset_class === 'commodity');

    let updatedCount = 0;
    const results = [];
    const errors = [];

    // ── CRYPTO / DEFI ──
    if (cryptoPairs.length > 0) {
      const cgIds = [...new Set(
        cryptoPairs.map(p => SYMBOL_TO_CGID[(p.base_asset || p.symbol.split('/')[0]).toUpperCase()])
          .filter(Boolean)
      )];

      if (cgIds.length > 0) {
        const res = await fetch(
          `${CG}/coins/markets?vs_currency=usd&ids=${cgIds.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (res.ok) {
          const coins = await res.json();
          const byId = Object.fromEntries(coins.map(c => [c.id, c]));

          for (const pair of cryptoPairs) {
            const base = (pair.base_asset || pair.symbol.split('/')[0]).toUpperCase();
            const coin = byId[SYMBOL_TO_CGID[base]];
            if (!coin) { errors.push(`No CoinGecko data for ${pair.symbol}`); continue; }

            await base44.asServiceRole.entities.TradingPair.update(pair.id, {
              current_price: coin.current_price,
              price_change_24h: coin.price_change_percentage_24h,
              volume_24h: coin.total_volume,
              high_24h: coin.high_24h,
              low_24h: coin.low_24h,
              exchange_source: 'CoinGecko',
            });
            updatedCount++;
            results.push({ symbol: pair.symbol, price: coin.current_price, change_24h: coin.price_change_percentage_24h });
          }
        } else {
          errors.push(`CoinGecko API error: ${res.status}`);
        }
      }
    }

    // ── FX ──
    if (fxPairs.length > 0) {
      const fxRes = await fetch(FX_API, { headers: { 'Accept': 'application/json' } });
      if (fxRes.ok) {
        const { rates } = await fxRes.json();

        for (const pair of fxPairs) {
          const parts = pair.symbol.replace('-', '/').split('/');
          const base = parts[0]?.toUpperCase();
          const quote = parts[1]?.toUpperCase() || 'USD';
          let price = null;

          if (base === 'USD') {
            price = rates[quote] ? 1 / rates[quote] : null;
          } else if (quote === 'USD') {
            price = rates[base] ? 1 / rates[base] : null;
          } else if (rates[base] && rates[quote]) {
            price = rates[quote] / rates[base];
          }

          if (price !== null) {
            await base44.asServiceRole.entities.TradingPair.update(pair.id, {
              current_price: parseFloat(price.toFixed(5)),
              exchange_source: 'Open Exchange Rates',
            });
            updatedCount++;
            results.push({ symbol: pair.symbol, price });
          }
        }
      } else {
        errors.push('FX API error');
      }
    }

    // ── COMMODITY ── (exchange connection tomorrow)
    for (const pair of commodityPairs) {
      results.push({ symbol: pair.symbol, note: 'Pending exchange connection' });
    }

    return Response.json({
      success: true,
      updated: updatedCount,
      pairs_total: pairs.length,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
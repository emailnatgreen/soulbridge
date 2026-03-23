import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CG = 'https://api.coingecko.com/api/v3';

const SYMBOL_TO_CGID = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
  ADA: 'cardano', AVAX: 'avalanche-2', MATIC: 'matic-network',
  DOT: 'polkadot', LINK: 'chainlink', DOGE: 'dogecoin',
  BNB: 'binancecoin', LTC: 'litecoin', BCH: 'bitcoin-cash',
  ATOM: 'cosmos', UNI: 'uniswap', AAVE: 'aave', CRV: 'curve-dao-token',
  MKR: 'maker', COMP: 'compound-governance-token',
  FTM: 'fantom', NEAR: 'near', OP: 'optimism', ARB: 'arbitrum',
  INJ: 'injective-protocol', APT: 'aptos', SUI: 'sui', TON: 'the-open-network',
};

// CoinGecko returns different granularities:
// days=1 → 5min intervals
// days=2-90 → hourly
// days>90 → daily
const INTERVAL_DAYS = {
  '15m': '1',
  '1H': '7',
  '4H': '30',
  '1D': '90',
  '1W': '365',
};

const MAX_POINTS = {
  '15m': 96,
  '1H': 168,
  '4H': 180,
  '1D': 90,
  '1W': 52,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    try { await base44.auth.me(); } catch (_) { /* ok */ }

    const { symbol, asset_class, interval = '1H' } = await req.json();
    if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

    const base = symbol.split('/')[0].toUpperCase();
    const cgId = SYMBOL_TO_CGID[base];
    const days = INTERVAL_DAYS[interval] || '7';
    const maxPoints = MAX_POINTS[interval] || 168;

    // For FX/commodity, return empty (chart will simulate)
    if (!cgId || (asset_class !== 'crypto' && asset_class !== 'defi')) {
      return Response.json({
        success: true,
        symbol,
        interval,
        source: 'pending',
        data: [],
      });
    }

    const res = await fetch(
      `${CG}/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) {
      return Response.json({ error: `CoinGecko: ${res.status}` }, { status: 502 });
    }

    const raw = await res.json();
    const prices = raw.prices || [];
    const volumes = raw.total_volumes || [];

    // Subsample for performance
    const step = Math.max(1, Math.floor(prices.length / maxPoints));
    const data = [];

    for (let i = 0; i < prices.length; i += step) {
      const [ts, price] = prices[i];
      const vol = volumes[i]?.[1] || 0;
      data.push({
        time: new Date(ts).toISOString(),
        price: parseFloat(price.toFixed(6)),
        volume: parseFloat((vol / 1_000_000).toFixed(3)), // millions USD
      });
    }

    const closes = data.map(d => d.price);
    const stats = {
      open: closes[0] || 0,
      high: Math.max(...closes),
      low: Math.min(...closes),
      close: closes[closes.length - 1] || 0,
    };

    return Response.json({
      success: true,
      symbol,
      interval,
      source: 'coingecko',
      stats,
      data,
      count: data.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
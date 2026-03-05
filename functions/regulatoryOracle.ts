import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Regulatory thresholds per CR-01/2026
const COMPLIANCE_THRESHOLDS = {
  max_spread_percent: 2.0,
  min_liquidity_xrp: 1000,
  max_volatility_24h: 15.0,
  max_drawdown_percent: 10.0,
};

// Fetch XRPL DEX orderbook spread for a given pair
async function fetchXRPLSpread(base, quote) {
  const response = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'book_offers',
      params: [{ taker_gets: { currency: quote }, taker_pays: { currency: base }, limit: 5 }]
    })
  });
  const data = await response.json();
  const offers = data?.result?.offers || [];
  if (offers.length < 2) return null;
  const bestAsk = parseFloat(offers[0]?.quality || 0);
  const bestBid = parseFloat(offers[offers.length - 1]?.quality || 0);
  const spreadPercent = bestAsk > 0 ? ((bestAsk - bestBid) / bestAsk) * 100 : null;
  return spreadPercent;
}

// Fetch price data from CoinGecko (free, no key required)
async function fetchMarketData(coinId) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return {
    price_usd: data?.market_data?.current_price?.usd,
    change_24h: data?.market_data?.price_change_percentage_24h,
    market_cap: data?.market_data?.market_cap?.usd,
    volume_24h: data?.market_data?.total_volume?.usd,
  };
}

// Evaluate compliance status against CR-01/2026 thresholds
function evaluateCompliance(marketData, spread) {
  const violations = [];
  const warnings = [];

  if (spread !== null && spread > COMPLIANCE_THRESHOLDS.max_spread_percent) {
    violations.push(`Spread ${spread.toFixed(2)}% exceeds CR-01/2026 max of ${COMPLIANCE_THRESHOLDS.max_spread_percent}%`);
  }

  if (marketData?.change_24h !== undefined) {
    const vol = Math.abs(marketData.change_24h);
    if (vol > COMPLIANCE_THRESHOLDS.max_volatility_24h) {
      violations.push(`24h volatility ${vol.toFixed(2)}% exceeds CR-01/2026 max of ${COMPLIANCE_THRESHOLDS.max_volatility_24h}%`);
    } else if (vol > COMPLIANCE_THRESHOLDS.max_volatility_24h * 0.75) {
      warnings.push(`24h volatility ${vol.toFixed(2)}% approaching CR-01/2026 limit`);
    }
  }

  const status = violations.length > 0 ? 'NON_COMPLIANT' : warnings.length > 0 ? 'WARNING' : 'COMPLIANT';
  return { status, violations, warnings };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const assets = body.assets || ['ripple', 'dogecoin', 'vechain'];
  const mode = body.mode || 'full'; // 'full' | 'status_only'

  const results = await Promise.all(
    assets.map(async (coinId) => {
      const marketData = await fetchMarketData(coinId);
      const spread = coinId === 'ripple' ? await fetchXRPLSpread('XRP', 'USD') : null;
      const compliance = evaluateCompliance(marketData, spread);

      return {
        asset: coinId,
        timestamp: new Date().toISOString(),
        market_data: mode === 'full' ? marketData : undefined,
        spread_percent: spread,
        compliance,
        trading_signal: compliance.status === 'NON_COMPLIANT' ? 'HALT' :
                        compliance.status === 'WARNING' ? 'REDUCE_EXPOSURE' : 'PROCEED',
      };
    })
  );

  const overallStatus = results.some(r => r.compliance.status === 'NON_COMPLIANT') ? 'NON_COMPLIANT' :
                        results.some(r => r.compliance.status === 'WARNING') ? 'WARNING' : 'COMPLIANT';

  return Response.json({
    oracle_version: '1.0.0',
    resolution: 'CR-01/2026',
    evaluated_at: new Date().toISOString(),
    overall_status: overallStatus,
    assets: results,
    thresholds_applied: COMPLIANCE_THRESHOLDS,
  });
});
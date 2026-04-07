import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch live XRP/USD price from CoinGecko (free, no API key needed)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      // Fallback rate if API is down
      return Response.json({ price: 1.31, source: 'fallback', timestamp: new Date().toISOString() });
    }

    const data = await response.json();
    const price = data?.ripple?.usd;

    if (typeof price !== 'number' || price <= 0) {
      return Response.json({ price: 1.31, source: 'fallback', timestamp: new Date().toISOString() });
    }

    return Response.json({ price, source: 'coingecko', timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ price: 1.31, source: 'fallback', timestamp: new Date().toISOString() });
  }
});
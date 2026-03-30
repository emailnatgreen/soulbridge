import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ENDPOINTS = [
  'https://xrplcluster.com/',
  'https://s1.ripple.com:51234/',
  'https://s2.ripple.com:51234/',
];

async function xrplFetch(body) {
  for (const url of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await r.json();
      if (data?.result) return data;
    } catch (_) {}
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    // Read the body first — no auth required for read-only XRPL queries
    const { method, params, addresses } = await req.json();

    // Batch mode: fetch balances for multiple addresses at once
    if (addresses && Array.isArray(addresses)) {
      const results = await Promise.allSettled(
        addresses.map(addr =>
          xrplFetch({
            method: 'account_info',
            params: [{ account: addr, ledger_index: 'current' }]
          }).then(d => {
            if (d?.result?.account_data) {
              return {
                address: addr,
                balance: parseInt(d.result.account_data.Balance, 10) / 1e6,
                active: true,
              };
            }
            return { address: addr, balance: 0, active: false };
          })
        )
      );
      const balances = {};
      results.forEach((r, i) => {
        balances[addresses[i]] = r.status === 'fulfilled'
          ? r.value
          : { address: addresses[i], balance: 0, active: false };
      });
      return Response.json({ balances });
    }

    // Single RPC call mode
    if (method) {
      const data = await xrplFetch({ method, params: params || [] });
      return Response.json({ result: data?.result || null });
    }

    return Response.json({ error: 'Provide either "addresses" array or "method" + "params"' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
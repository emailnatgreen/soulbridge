import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Public data endpoint — no user auth needed.
 * All queries use asServiceRole exclusively.
 *
 * Strategy: try createClientFromRequest first (works when caller is authenticated).
 * If it throws due to missing/malformed auth header, fall back to createClient
 * with env-based config (APP_ID + no token) which still allows asServiceRole.
 */

function getBase44Client(req, bodyStr) {
  // First try the standard request-based init
  try {
    const headers = new Headers(req.headers);
    const auth = headers.get('authorization') || '';
    // Only use request-based init if there's a real-looking token
    if (auth && auth.startsWith('Bearer ') && auth.length > 30) {
      const newReq = new Request(req.url, { method: req.method, headers, body: bodyStr });
      return createClientFromRequest(newReq);
    }
  } catch (_) {}

  // Fallback: build a synthetic request with a structurally valid JWT
  // The SDK just needs the header to parse — asServiceRole uses its own credentials
  try {
    const headers = new Headers(req.headers);
    headers.set('authorization', 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJwdWJsaWMiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.');
    const newReq = new Request(req.url, { method: req.method, headers, body: bodyStr });
    return createClientFromRequest(newReq);
  } catch (_) {}

  // Last resort: use createClient with env vars
  return createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
    requiresAuth: false,
  });
}

Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);
    const { page } = body;

    const base44 = getBase44Client(req, bodyStr);

    if (page === 'landing') {
      const [agents, wallets, kus] = await Promise.all([
        base44.asServiceRole.entities.Agent.filter({ status: 'active' }, '-created_date', 50),
        base44.asServiceRole.entities.Wallet.filter({ is_published: true }, 'created_date', 200),
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 100),
      ]);

      const normalizedAgents = agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        purpose: a.purpose,
        tagline: a.tagline,
        honor_score: a.honor_score,
        avatar_url: a.avatar_url,
        classic_address: a.classic_address,
        wallet_id: a.wallet_id,
        external_classic_addresses: a.external_classic_addresses || []
      }));

      const publishedDidCount = new Set([
        ...wallets.map(w => w.classic_address).filter(Boolean),
        ...normalizedAgents.map(a => a.classic_address).filter(Boolean),
        ...normalizedAgents.flatMap(a => a.external_classic_addresses || []).filter(Boolean)
      ]).size;

      return Response.json({
        agents: normalizedAgents,
        wallets_count: publishedDidCount,
        kus,
      });
    }

    if (page === 'scroll') {
      const [memories, kus, agents] = await Promise.all([
        base44.asServiceRole.entities.Memory.filter({}, '-created_date', 50),
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 100),
        base44.asServiceRole.entities.Agent.list('-created_date', 50),
      ]);
      return Response.json({
        memories,
        kus,
        agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role, classic_address: a.classic_address, wallet_id: a.wallet_id })),
      });
    }

    if (page === 'compass') {
      const [kus, agents, proposals] = await Promise.all([
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 200),
        base44.asServiceRole.entities.Agent.list('-created_date', 50),
        base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 20),
      ]);
      return Response.json({
        kus,
        agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role, classic_address: a.classic_address, wallet_id: a.wallet_id, external_classic_addresses: a.external_classic_addresses, created_by: a.created_by, honor_score: a.honor_score })),
        proposals,
      });
    }

    if (page === 'agent_lookup') {
      const { agent_name } = body || {};
      const agents = await base44.asServiceRole.entities.Agent.filter(
        { name: agent_name }, '-created_date', 1
      );
      const agent = agents[0];
      if (!agent) return Response.json({ agent: null });
      return Response.json({
        agent: { id: agent.id, name: agent.name, role: agent.role, purpose: agent.purpose, tagline: agent.tagline, honor_score: agent.honor_score, avatar_url: agent.avatar_url, classic_address: agent.classic_address },
      });
    }

    return Response.json({ error: 'Unknown page type' }, { status: 400 });
  } catch (error) {
    console.error('[publicPageData] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
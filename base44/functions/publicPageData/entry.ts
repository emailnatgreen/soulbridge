import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Fetches entity data for public-facing pages using service role.
 * No user authentication required — uses asServiceRole exclusively.
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { page } = body;

    // Ensure auth header exists for SDK init — inject a dummy if missing
    // since we only use asServiceRole and never need user auth
    if (!req.headers.get('authorization') || !req.headers.get('authorization').startsWith('Bearer ')) {
      const headers = new Headers(req.headers);
      headers.set('authorization', 'Bearer public');
      req = new Request(req.url, { method: req.method, headers, body: JSON.stringify(body) });
    }

    const base44 = createClientFromRequest(req);

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
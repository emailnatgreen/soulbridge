import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Fetches entity data for public-facing pages using service role.
 * This bypasses entity security rules so unauthenticated visitors can view
 * aggregated/anonymised Village data on Landing, ScrollOfResonance, KineticCompass.
 * No authentication required — uses asServiceRole only.
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { page } = body;

    // Extract and validate JWT token
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const isValidJwt = rawToken && rawToken.includes('.') && rawToken.length > 20;

    // Build a completely fresh request — only include headers we explicitly set
    const freshHeaders = new Headers();
    freshHeaders.set('content-type', 'application/json');
    for (const [key, value] of req.headers.entries()) {
      if (key.startsWith('x-base44') || key.startsWith('x-app')) {
        freshHeaders.set(key, value);
      }
    }
    if (isValidJwt) {
      freshHeaders.set('authorization', `Bearer ${rawToken}`);
    }

    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers: freshHeaders,
      body: JSON.stringify(body),
    }));

    if (page === 'landing') {
      const [agents, wallets, kus] = await Promise.all([
        base44.asServiceRole.entities.Agent.filter({ status: 'active' }, '-created_date', 200),
        base44.asServiceRole.entities.Wallet.filter({ is_published: true }, 'created_date', 1000),
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 500),
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
        ...wallets.map((wallet) => wallet.classic_address).filter(Boolean),
        ...normalizedAgents.map((agent) => agent.classic_address).filter(Boolean),
        ...normalizedAgents.flatMap((agent) => agent.external_classic_addresses || []).filter(Boolean)
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
        base44.asServiceRole.entities.Agent.list('-created_date', 200),
      ]);
      return Response.json({
        memories,
        kus,
        agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role, classic_address: a.classic_address, wallet_id: a.wallet_id })),
      });
    }

    if (page === 'compass') {
      const [kus, agents, proposals] = await Promise.all([
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 1000),
        base44.asServiceRole.entities.Agent.list('-created_date', 200),
        base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 50),
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
        { name: agent_name },
        '-created_date',
        1
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
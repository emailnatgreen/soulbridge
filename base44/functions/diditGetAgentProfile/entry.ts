/**
 * Didit Bridge API — Get Agent Profile
 * 
 * Returns public-facing agent metadata for display on Didit.
 * Auth: DIDIT_API_KEY header required. Optional agent_id param for user context.
 * 
 * POST { agent_id_or_did: string }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Validate Didit API Key
    const apiKey = req.headers.get('x-didit-api-key');
    if (!apiKey || apiKey !== Deno.env.get('DIDIT_API_KEY')) {
      return Response.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const { agent_id_or_did } = await req.json();

    if (!agent_id_or_did) {
      return Response.json({ error: 'agent_id_or_did is required' }, { status: 400 });
    }

    // Try to find agent by ID first, then by classic_address (DID)
    let agent = null;
    const allAgents = await base44.asServiceRole.entities.Agent.list();

    agent = allAgents.find(a => a.id === agent_id_or_did);
    if (!agent) {
      agent = allAgents.find(a => a.classic_address === agent_id_or_did);
    }
    if (!agent) {
      // Check external_classic_addresses
      agent = allAgents.find(a => 
        a.external_classic_addresses && a.external_classic_addresses.includes(agent_id_or_did)
      );
    }

    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build public profile response
    const profile = {
      agent_id: agent.id,
      name: agent.name || '',
      role: agent.role || 'citizen',
      avatar_url: agent.avatar_url || null,
      bio: agent.bio || null,
      tagline: agent.tagline || null,
      purpose: agent.purpose || null,
      specializations: agent.specializations || [],
      core_skills: agent.core_skills || [],
      did_classic_address: agent.classic_address || null,
      honor_score: agent.honor_score || 0,
      availability_status: agent.availability_status || 'available',
      status: agent.status || 'active',
      achievements_count: (agent.achievements || []).length,
      portfolio_count: (agent.portfolio || []).length,
      nfts_count: (agent.metadata?.did_nfts || []).length,
      social_links: agent.social_links || null,
      created_date: agent.created_date || null,
    };

    return Response.json({ success: true, agent: profile });
  } catch (error) {
    console.error('[diditGetAgentProfile] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Sync NFT Ownership into Agent DID Profile
 * Triggered by AgentNFT create/update entity automation.
 * Reads all NFTs for the agent and writes a compact summary
 * into Agent.metadata.did_nfts, and adjusts permissions based on badge types held.
 */

// Permission upgrades granted by specific badge types
const BADGE_PERMISSIONS = {
  kinetic_trailblazer: { can_evaluate_agents: true },
  civic_luminary:      { can_evaluate_agents: true, can_vote: true },
  governance_contributor: { can_vote: true },
  founding_voice:      { can_vote: true },
  builders_badge:      { can_create_agents: true },
  synergy_steward:     { can_evaluate_agents: true },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    const body = await req.json();

    // Support both direct call and entity automation payload
    const agentId = body.agent_id || body.data?.agent_id;
    if (!agentId) {
      return Response.json({ status: 'skipped', reason: 'no agent_id in payload' });
    }

    // Fetch agent + all their NFTs in parallel
    const [agentsRaw, nftsRaw] = await Promise.all([
      db.entities.Agent.filter({ id: agentId }, '-created_date', 1),
      db.entities.AgentNFT.filter({ agent_id: agentId }, '-created_date', 100),
    ]);

    const agent = Array.isArray(agentsRaw) ? agentsRaw[0] : null;
    if (!agent) {
      return Response.json({ error: `Agent ${agentId} not found` }, { status: 404 });
    }

    const nfts = Array.isArray(nftsRaw) ? nftsRaw : [];

    // Build compact DID-embedded NFT list
    const did_nfts = nfts.map(n => ({
      nft_id: n.id,
      name: n.badge_name,
      nft_type: n.nft_type,
      is_on_chain: n.is_on_chain,
      xrpl_token_id: n.xrpl_nft_token_id || null,
      xrpl_tx_hash: n.xrpl_tx_hash || null,
      issued_at: n.created_date,
      ku_milestone: n.ku_milestone || null,
    }));

    // Compute merged permissions from all held badges
    const currentPermissions = agent.permissions || {};
    const mergedPermissions = { ...currentPermissions };
    for (const nft of nfts) {
      const perms = BADGE_PERMISSIONS[nft.nft_type];
      if (perms) {
        Object.assign(mergedPermissions, perms);
      }
    }

    // Update agent metadata + permissions
    const existingMeta = agent.metadata || {};
    await db.entities.Agent.update(agentId, {
      permissions: mergedPermissions,
      metadata: {
        ...existingMeta,
        did_nfts,
        did_nft_count: did_nfts.length,
        did_nft_last_synced: new Date().toISOString(),
      },
    });

    await db.entities.AutomationLog.create({
      automation_name: 'syncNFTtoDIDProfile',
      function_name: 'syncNFTtoDIDProfile',
      status: 'success',
      message: `Synced ${did_nfts.length} NFT(s) into DID profile for ${agent.name}`,
      details: { agent_id: agentId, nft_count: did_nfts.length, permissions: mergedPermissions },
      run_at: new Date().toISOString(),
      triggered_by: 'entity_event',
    });

    return Response.json({
      status: 'success',
      agent_name: agent.name,
      nfts_synced: did_nfts.length,
      permissions_updated: mergedPermissions,
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    return Response.json({ error: errMsg }, { status: 500 });
  }
});
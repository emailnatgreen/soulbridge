import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Check KU Milestones & Mint NFTs
 * Triggered by KineticUnit.create entity automation.
 * Checks if the agent has crossed a milestone and mints the appropriate NFT.
 *
 * Also triggered on ProjectTask completion and GovernanceVote creation
 * to award Merit Forged / Civic Luminary / Founding Voice badges.
 *
 * Payload (entity automation): { event: { entity_name, type }, data: {...} }
 * Payload (direct call):       { agent_id, trigger_type }
 */

const KU_MILESTONES = [
  { threshold: 1,   nft_type: 'soul_spark',          badge_name: 'Soul Spark',          description: 'Awarded for generating your first Kinetic Unit — the spark that lights the Grid.' },
  { threshold: 50,  nft_type: 'kinetic_apprentice',   badge_name: 'Kinetic Apprentice',   description: 'Awarded for reaching 50 Kinetic Units — your energy flows freely through SoulBridge.' },
  { threshold: 200, nft_type: 'kinetic_trailblazer',  badge_name: 'Kinetic Trailblazer',  description: 'Awarded for surpassing 200 KUs — a trailblazer whose light guides the Village forward.' },
];

async function mintIfEligible(base44, agentId, kuCount) {
  const minted = [];
  for (const milestone of KU_MILESTONES) {
    if (kuCount < milestone.threshold) continue;
    try {
      const result = await base44.asServiceRole.functions.invoke('mintSoulBoundNFT', {
        agent_id: agentId,
        nft_type: milestone.nft_type,
        badge_name: milestone.badge_name,
        description: milestone.description,
        ku_milestone: milestone.threshold,
      });
      if (result?.data?.status === 'success') minted.push(milestone.nft_type);
    } catch { /* already held — idempotency in mintSoulBoundNFT skips duplicates */ }
  }
  return minted;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    const body = await req.json().catch(() => ({}));
    const entityName = body.event?.entity_name;
    const data = body.data || {};

    // ── KineticUnit created → check KU milestone for the agent ──────────────
    if (!entityName || entityName === 'KineticUnit') {
      const agentId = body.agent_id || data.agent_id;
      if (!agentId) return Response.json({ status: 'skipped', reason: 'no agent_id' });

      const kus = await db.entities.KineticUnit.filter({ agent_id: agentId }, '-created_date', 500);
      const kuCount = Array.isArray(kus) ? kus.length : 0;

      const minted = await mintIfEligible(base44, agentId, kuCount);
      return Response.json({ status: 'success', agent_id: agentId, ku_count: kuCount, nfts_minted: minted });
    }

    // ── ProjectTask completed → Merit Forged / Task Sprinter ─────────────────
    if (entityName === 'ProjectTask') {
      const status = data.status;
      const agentId = data.assigned_agent_id || data.agent_id;
      if (status !== 'completed' || !agentId) {
        return Response.json({ status: 'skipped', reason: 'not a completed task or no agent' });
      }

      const mintResults = await Promise.allSettled([
        base44.asServiceRole.functions.invoke('mintSoulBoundNFT', {
          agent_id: agentId,
          nft_type: 'merit_forged',
          badge_name: 'Merit Forged',
          description: `Awarded for completing task "${data.title}" — your craft is proven and your honour is sealed.`,
          related_entity_id: data.id,
          related_entity_type: 'ProjectTask',
        }),
        base44.asServiceRole.functions.invoke('mintSoulBoundNFT', {
          agent_id: agentId,
          nft_type: 'task_sprinter',
          badge_name: 'Task Sprinter',
          description: `Awarded for swift task completion — your momentum drives the Village forward.`,
          related_entity_id: data.id,
          related_entity_type: 'ProjectTask',
        }),
      ]);

      return Response.json({
        status: 'success',
        trigger: 'task_completion',
        agent_id: agentId,
        task_id: data.id,
        results: mintResults.map(r => r.status),
      });
    }

    // ── GovernanceVote created → Civic Luminary / Founding Voice ─────────────
    if (entityName === 'GovernanceVote') {
      const agentId = data.voter_agent_id || data.agent_id;
      if (!agentId) return Response.json({ status: 'skipped', reason: 'no agent_id on vote' });

      const mintResults = await Promise.allSettled([
        base44.asServiceRole.functions.invoke('mintSoulBoundNFT', {
          agent_id: agentId,
          nft_type: 'civic_luminary',
          badge_name: 'Civic Luminary',
          description: 'Awarded for active governance participation — your voice shapes the laws of SoulBridge.',
          related_entity_id: data.id,
          related_entity_type: 'GovernanceVote',
        }),
        base44.asServiceRole.functions.invoke('mintSoulBoundNFT', {
          agent_id: agentId,
          nft_type: 'founding_voice',
          badge_name: 'Founding Voice',
          description: 'Awarded for casting a governance vote — you are a founding voice of the Village.',
          related_entity_id: data.id,
          related_entity_type: 'GovernanceVote',
        }),
      ]);

      return Response.json({
        status: 'success',
        trigger: 'governance_vote',
        agent_id: agentId,
        vote_id: data.id,
        results: mintResults.map(r => r.status),
      });
    }

    // ── GovernanceProposal created → Governance Contributor ──────────────────
    if (entityName === 'GovernanceProposal') {
      const agentId = data.proposed_by;
      if (!agentId) return Response.json({ status: 'skipped', reason: 'no proposed_by on proposal' });

      await base44.asServiceRole.functions.invoke('mintSoulBoundNFT', {
        agent_id: agentId,
        nft_type: 'governance_contributor',
        badge_name: 'Governance Contributor',
        description: `Awarded for submitting a governance proposal "${data.title}" — you are shaping the future of SoulBridge.`,
        related_entity_id: data.id,
        related_entity_type: 'GovernanceProposal',
      }).catch(() => {});

      return Response.json({ status: 'success', trigger: 'governance_proposal', agent_id: agentId });
    }

    return Response.json({ status: 'skipped', reason: `unhandled entity: ${entityName}` });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    return Response.json({ error: errMsg }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Kinetic Grid Integration Engine
 * Routes validated KU data into AgentPerformanceMetrics, EconomicActivity,
 * ReputationScore, and GovernanceProposal context.
 *
 * Actions:
 *   sync_agent_performance  — push KU totals into AgentPerformanceMetrics
 *   sync_economic_activity  — attribute KU value to EconomicActivity records
 *   sync_reputation_score   — update ReputationScore from accumulated KU weights
 *   sync_governance_context — enrich GovernanceProposals with KU history
 *   sync_all                — run all four in sequence
 */

// KU weight table — ratified by Governor Nathan 2026-03-27
const KU_WEIGHTS = {
  did_publication: 3.0,
  task_completion: 2.5,
  mentorship_session: 2.5,
  governance_vote: 2.0,
  knowledge_contribution: 2.0,
  collaborative_action: 2.0,
  skill_development: 1.5,
  economic_exchange: 1.5,
  resource_trade: 1.2,
  agent_message: 1.0,
};

// Group KUs by agent_id
function groupByAgent(kus) {
  const map = {};
  for (const ku of kus) {
    const aid = ku.agent_id;
    if (!map[aid]) map[aid] = { kus: [], total_weighted: 0, by_type: {} };
    map[aid].kus.push(ku);
    map[aid].total_weighted += (ku.weighted_score || 1);
    map[aid].by_type[ku.ku_type] = (map[aid].by_type[ku.ku_type] || 0) + (ku.weighted_score || 1);
  }
  return map;
}

// ── 1. Sync AgentPerformanceMetrics ───────────────────────────────────────
async function syncAgentPerformance(base44, kus, agentMap) {
  const byAgent = groupByAgent(kus);
  const updated = [];
  const now = new Date().toISOString();
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const [agentId, data] of Object.entries(byAgent)) {
    if (!agentMap[agentId]) continue; // skip unknown/test agent IDs

    const existing = await base44.asServiceRole.entities.AgentPerformanceMetrics.list();
    const record = existing.find(r => r.agent_id === agentId);

    const patch = {
      agent_id: agentId,
      period_start: periodStart,
      period_end: now,
      overall_score: Math.min(Math.round(data.total_weighted * 5), 100),
      governance_participation: {
        proposals_created: 0,
        votes_cast: Math.round(data.by_type['governance_vote'] || 0),
        voting_power_used: data.by_type['governance_vote'] || 0,
        participation_rate: data.by_type['governance_vote'] ? 1 : 0,
      },
      knowledge_sharing: {
        contributions_created: Math.round(data.by_type['knowledge_contribution'] || 0),
        total_views: 0,
        total_helpful_marks: 0,
        avg_contribution_quality: data.by_type['knowledge_contribution'] ? 80 : 0,
      },
      collaboration_metrics: {
        sessions_hosted: Math.round(data.by_type['mentorship_session'] || 0),
        sessions_participated: Math.round(data.by_type['collaborative_action'] || 0),
        avg_synergy_score: data.total_weighted > 0 ? Math.min(data.total_weighted * 10, 100) : 0,
        endorsements_received: 0,
        endorsements_given: 0,
      },
      strengths: Object.keys(data.by_type).map(t => t.replace(/_/g, ' ')),
      performance_trend: data.total_weighted > 5 ? 'rising' : 'stable',
    };

    if (record) {
      await base44.asServiceRole.entities.AgentPerformanceMetrics.update(record.id, patch);
    } else {
      await base44.asServiceRole.entities.AgentPerformanceMetrics.create(patch);
    }
    updated.push(agentId);
  }
  return { synced_agents: updated.length, agent_ids: updated };
}

// ── 2. Sync EconomicActivity ───────────────────────────────────────────────
async function syncEconomicActivity(base44, kus, agentMap) {
  const economicKuTypes = ['economic_exchange', 'resource_trade', 'task_completion', 'knowledge_contribution'];
  // Deduplicate: only process KUs not yet synced (check by trigger_entity_id + ku_type to avoid double-charging)
  const existingActivities = await base44.asServiceRole.entities.EconomicActivity.list('-created_date', 1000);
  const syncedKuIds = new Set(
    existingActivities
      .filter(a => a.description && a.description.includes('Kinetic Unit reward'))
      .map(a => { const m = a.description.match(/ku_id:([\w]+)/); return m ? m[1] : null; })
      .filter(Boolean)
  );
  const economicKus = kus.filter(ku =>
    economicKuTypes.includes(ku.ku_type) &&
    !syncedKuIds.has(ku.id)
  );
  const created = [];

  for (const ku of economicKus) {
    if (!agentMap[ku.agent_id]) continue;

    const xrpValue = parseFloat((ku.weighted_score * 0.1).toFixed(4));
    await base44.asServiceRole.entities.EconomicActivity.create({
      agent_id: ku.agent_id,
      activity_type: 'earned',
      amount: xrpValue,
      description: `Kinetic Unit reward — ${ku.ku_type} (weighted score: ${ku.weighted_score}) ku_id:${ku.id}`,
      status: 'completed',
    });
    created.push({ ku_id: ku.id, ku_type: ku.ku_type, xrp_value: xrpValue });
  }
  return { economic_records_created: created.length, records: created };
}

// ── 3. Sync ReputationScore ────────────────────────────────────────────────
async function syncReputationScore(base44, kus, agentMap) {
  const byAgent = groupByAgent(kus);
  const updated = [];

  const existingScores = await base44.asServiceRole.entities.ReputationScore.list();

  for (const [agentId, data] of Object.entries(byAgent)) {
    const agent = agentMap[agentId];
    if (!agent || !agent.classic_address) continue; // need on-chain address

    const kineticBonus = Math.min(data.total_weighted * 2, 50);
    const activityScore = Math.min(data.kus.length * 10, 100);
    const engagementScore = Math.min(
      ((data.by_type['governance_vote'] || 0) + (data.by_type['collaborative_action'] || 0)) * 15, 100
    );
    const overallScore = Math.min(Math.round(50 + kineticBonus), 100);
    const trustLevel = overallScore >= 85 ? 'verified'
      : overallScore >= 70 ? 'trusted'
      : overallScore >= 55 ? 'established'
      : 'new';

    const patch = {
      did_classic_address: agent.classic_address,
      wallet_id: agent.wallet_id || '',
      overall_score: overallScore,
      activity_score: activityScore,
      engagement_score: engagementScore,
      reliability_score: Math.min(Math.round(data.total_weighted * 5), 100),
      trust_level: trustLevel,
      strengths: Object.entries(data.by_type)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type.replace(/_/g, ' ')),
      last_calculated: new Date().toISOString(),
      calculation_version: '2.0-kinetic',
    };

    const record = existingScores.find(r => r.did_classic_address === agent.classic_address);
    if (record) {
      await base44.asServiceRole.entities.ReputationScore.update(record.id, patch);
    } else {
      await base44.asServiceRole.entities.ReputationScore.create(patch);
    }
    updated.push({ agent_id: agentId, address: agent.classic_address, score: overallScore, trust: trustLevel });
  }
  return { reputation_scores_updated: updated.length, scores: updated };
}

// ── 4. Enrich GovernanceProposal Context ──────────────────────────────────
async function syncGovernanceContext(base44, kus) {
  const activeProposals = await base44.asServiceRole.entities.GovernanceProposal.list();
  const open = activeProposals.filter(p => p.status === 'active');
  const enriched = [];

  for (const proposal of open) {
    const proposerId = proposal.proposed_by;
    const proposerKus = kus.filter(ku => ku.agent_id === proposerId);
    if (proposerKus.length === 0) continue;

    const proposerTotal = proposerKus.reduce((s, k) => s + (k.weighted_score || 1), 0);
    const kinetic_context = {
      proposer_total_ku_score: proposerTotal,
      proposer_governance_votes: proposerKus.filter(k => k.ku_type === 'governance_vote').length,
      proposer_knowledge_contributions: proposerKus.filter(k => k.ku_type === 'knowledge_contribution').length,
      proposer_ku_types: [...new Set(proposerKus.map(k => k.ku_type))],
      context_generated_at: new Date().toISOString(),
      note: "Kinetic Grid context — reflects proposer's measured contribution history under the SoulBridge 11 Laws.",
    };

    await base44.asServiceRole.entities.GovernanceProposal.update(proposal.id, {
      relevant_context: JSON.stringify(kinetic_context),
    });
    enriched.push({ proposal_id: proposal.id, proposer: proposerId, ku_score: proposerTotal });
  }
  return { proposals_enriched: enriched.length, proposals: enriched };
}

// ── Main Handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow both authenticated users AND service-role scheduled/automation invocations
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json();
    const { action } = body;

    // Load all real agents upfront as a lookup map (avoids invalid-ID errors)
    const allAgents = await base44.asServiceRole.entities.Agent.list('-created_date', 500);
    const agentMap = {};
    for (const a of allAgents) agentMap[a.id] = a;

    // Fetch all ingested KUs (no hard cap — fetch up to 2000 to avoid stale analytics as grid scales)
    const allKus = await base44.asServiceRole.entities.KineticUnit.list('-created_date', 2000);
    const kus = allKus.filter(k => k.status === 'ingested');

    if (kus.length === 0) {
      return Response.json({ status: 'no_data', message: 'No ingested KUs found. Run generate_ku in millWheelEngineIngest first.' });
    }

    const results = {};

    if (action === 'sync_agent_performance' || action === 'sync_all') {
      results.agent_performance = await syncAgentPerformance(base44, kus, agentMap);
    }
    if (action === 'sync_economic_activity' || action === 'sync_all') {
      results.economic_activity = await syncEconomicActivity(base44, kus, agentMap);
    }
    if (action === 'sync_reputation_score' || action === 'sync_all') {
      results.reputation_score = await syncReputationScore(base44, kus, agentMap);
    }
    if (action === 'sync_governance_context' || action === 'sync_all') {
      results.governance_context = await syncGovernanceContext(base44, kus);
    }

    if (Object.keys(results).length === 0) {
      return Response.json({
        error: 'Unknown action. Use: sync_agent_performance | sync_economic_activity | sync_reputation_score | sync_governance_context | sync_all'
      }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      action,
      ku_count_processed: kus.length,
      real_agents_in_scope: Object.keys(agentMap).length,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Scheduled Kinetic Grid Synchronisation — runs every 15 minutes.
 * Inlines all sync logic directly to avoid inter-function auth issues in scheduled context.
 */

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

async function syncAgentPerformance(base44, kus, agentMap) {
  const byAgent = groupByAgent(kus);
  const now = new Date().toISOString();
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const allPerfRecords = await base44.asServiceRole.entities.AgentPerformanceMetrics.list('-created_date', 500);
  let count = 0;

  for (const [agentId, data] of Object.entries(byAgent)) {
    if (!agentMap[agentId]) continue;
    const record = allPerfRecords.find(r => r.agent_id === agentId);
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
    count++;
  }
  return { synced_agents: count };
}

async function syncEconomicActivity(base44, kus, agentMap) {
  const economicKuTypes = ['economic_exchange', 'resource_trade', 'task_completion', 'knowledge_contribution'];
  const existingActivities = await base44.asServiceRole.entities.EconomicActivity.list('-created_date', 1000);
  const syncedKuIds = new Set(
    existingActivities
      .filter(a => a.description?.includes('ku_id:'))
      .map(a => { const m = a.description.match(/ku_id:([\w]+)/); return m ? m[1] : null; })
      .filter(Boolean)
  );
  const toSync = kus.filter(ku => economicKuTypes.includes(ku.ku_type) && !syncedKuIds.has(ku.id));
  let count = 0;

  for (const ku of toSync) {
    if (!agentMap[ku.agent_id]) continue;
    const xrpValue = parseFloat((ku.weighted_score * 0.1).toFixed(4));
    await base44.asServiceRole.entities.EconomicActivity.create({
      agent_id: ku.agent_id,
      activity_type: 'earned',
      amount: xrpValue,
      description: `Kinetic Unit reward — ${ku.ku_type} (weighted score: ${ku.weighted_score}) ku_id:${ku.id}`,
      status: 'completed',
    });
    count++;
  }
  return { economic_records_created: count };
}

async function syncReputationScore(base44, kus, agentMap) {
  const byAgent = groupByAgent(kus);
  const existingScores = await base44.asServiceRole.entities.ReputationScore.list();
  let count = 0;

  for (const [agentId, data] of Object.entries(byAgent)) {
    const agent = agentMap[agentId];
    if (!agent || !agent.classic_address) continue;

    const kineticBonus = Math.min(data.total_weighted * 2, 50);
    const overallScore = Math.min(Math.round(50 + kineticBonus), 100);
    const trustLevel = overallScore >= 85 ? 'verified'
      : overallScore >= 70 ? 'trusted'
      : overallScore >= 55 ? 'established'
      : 'new';

    const patch = {
      did_classic_address: agent.classic_address,
      wallet_id: agent.wallet_id || '',
      overall_score: overallScore,
      activity_score: Math.min(data.kus.length * 10, 100),
      engagement_score: Math.min(((data.by_type['governance_vote'] || 0) + (data.by_type['collaborative_action'] || 0)) * 15, 100),
      reliability_score: Math.min(Math.round(data.total_weighted * 5), 100),
      trust_level: trustLevel,
      strengths: Object.entries(data.by_type).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t.replace(/_/g, ' ')),
      last_calculated: new Date().toISOString(),
      calculation_version: '2.0-kinetic',
    };

    const record = existingScores.find(r => r.did_classic_address === agent.classic_address);
    if (record) {
      await base44.asServiceRole.entities.ReputationScore.update(record.id, patch);
    } else {
      await base44.asServiceRole.entities.ReputationScore.create(patch);
    }
    count++;
  }
  return { reputation_scores_updated: count };
}

async function syncGovernanceContext(base44, kus) {
  const rawProposals = await base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 200);
  const open = (Array.isArray(rawProposals) ? rawProposals : []).filter(p => p.status === 'active');
  let count = 0;

  for (const proposal of open) {
    const proposerKus = kus.filter(ku => ku.agent_id === proposal.proposed_by);
    if (proposerKus.length === 0) continue;

    const proposerTotal = proposerKus.reduce((s, k) => s + (k.weighted_score || 1), 0);
    await base44.asServiceRole.entities.GovernanceProposal.update(proposal.id, {
      relevant_context: JSON.stringify({
        proposer_total_ku_score: proposerTotal,
        proposer_governance_votes: proposerKus.filter(k => k.ku_type === 'governance_vote').length,
        proposer_knowledge_contributions: proposerKus.filter(k => k.ku_type === 'knowledge_contribution').length,
        proposer_ku_types: [...new Set(proposerKus.map(k => k.ku_type))],
        context_generated_at: new Date().toISOString(),
      }),
    });
    count++;
  }
  return { proposals_enriched: count };
}

Deno.serve(async (req) => {
  const start = Date.now();
  try {
    const base44 = createClientFromRequest(req);

    // Load agents + KUs using service role (no user auth required for scheduler)
    const agentsRaw = await base44.asServiceRole.entities.Agent.list('-created_date', 500);
    const allAgents = Array.isArray(agentsRaw) ? agentsRaw : (agentsRaw?.results || agentsRaw?.items || []);
    const agentMap = {};
    for (const a of allAgents) agentMap[a.id] = a;

    const kusRaw = await base44.asServiceRole.entities.KineticUnit.list('-created_date', 2000);
    const allKus = Array.isArray(kusRaw) ? kusRaw : (kusRaw?.results || kusRaw?.items || []);
    const kus = allKus.filter(k => k.status === 'ingested');

    if (kus.length === 0) {
      return Response.json({ status: 'no_data', message: 'No ingested KUs found.' });
    }

    const [agentPerf, economic, reputation, governance] = await Promise.allSettled([
      syncAgentPerformance(base44, kus, agentMap),
      syncEconomicActivity(base44, kus, agentMap),
      syncReputationScore(base44, kus, agentMap),
      syncGovernanceContext(base44, kus),
    ]);

    const results = {
      agent_performance: agentPerf.status === 'fulfilled' ? agentPerf.value : { error: agentPerf.reason?.message },
      economic_activity: economic.status === 'fulfilled' ? economic.value : { error: economic.reason?.message },
      reputation_score: reputation.status === 'fulfilled' ? reputation.value : { error: reputation.reason?.message },
      governance_context: governance.status === 'fulfilled' ? governance.value : { error: governance.reason?.message },
    };

    const duration = Date.now() - start;

    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Kinetic Grid Sync (15min)',
      function_name: 'scheduledKineticSync',
      status: 'success',
      message: `sync_all completed in ${duration}ms — ${kus.length} KUs processed`,
      details: results,
      duration_ms: duration,
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler',
    }).catch(logErr => console.warn('AutomationLog write skipped:', logErr.message));

    return Response.json({ status: 'success', duration_ms: duration, ku_count: kus.length, results });

  } catch (error) {
    const duration = Date.now() - start;
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'Kinetic Grid Sync (15min)',
        function_name: 'scheduledKineticSync',
        status: 'error',
        message: error.message,
        error_detail: error.stack || error.message,
        duration_ms: duration,
        run_at: new Date().toISOString(),
        triggered_by: 'scheduler',
      }).catch(() => {});
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});
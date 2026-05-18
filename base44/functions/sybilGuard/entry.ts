import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sybil Guard — One User, One Vote
 *
 * Phase 1 Blocker #2: Sybil Resilience
 *
 * Actions:
 *   check       — Pre-vote gate: validates one-user-one-vote for a proposal
 *   scan        — Pattern scan: detect suspicious multi-agent voting clusters
 *   status      — Get Sybil Guard system status and recent checks
 *
 * Privacy: All stored references use SHA-256 hashed user identifiers.
 * No raw emails in SybilGuardStatus entity.
 *
 * The authenticated user (auth.me()) is the trust root.
 * DIDs/agents are secondary signals for pattern detection.
 */

async function hashValue(val) {
  const enc = new TextEncoder().encode(String(val));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Risk signal detection
function detectRiskSignals(userAgents, userWallets, proposalVotes, userAgentIds) {
  const signals = [];

  // 1. High agent count — unusual for single user
  if (userAgents.length > 5) {
    signals.push({
      signal_type: 'high_agent_count',
      detail: `User controls ${userAgents.length} agents (threshold: 5)`,
      severity: userAgents.length > 10 ? 'high' : 'medium',
    });
  }

  // 2. Rapid agent creation (multiple agents created within 1 hour)
  const sortedByDate = [...userAgents].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  for (let i = 1; i < sortedByDate.length; i++) {
    const gap = new Date(sortedByDate[i].created_date) - new Date(sortedByDate[i - 1].created_date);
    if (gap < 3600000) { // less than 1 hour
      signals.push({
        signal_type: 'rapid_agent_creation',
        detail: `Agents "${sortedByDate[i - 1].name}" and "${sortedByDate[i].name}" created within ${Math.round(gap / 60000)} minutes`,
        severity: 'medium',
      });
      break; // only flag once
    }
  }

  // 3. Shared wallet patterns across agents
  const walletAddresses = userWallets.map(w => w.classic_address).filter(Boolean);
  const agentAddresses = userAgents.flatMap(a => [a.classic_address, ...(a.external_classic_addresses || [])]).filter(Boolean);
  const overlapping = walletAddresses.filter(addr => agentAddresses.includes(addr));
  if (overlapping.length > 2) {
    signals.push({
      signal_type: 'shared_wallet_pattern',
      detail: `${overlapping.length} wallet addresses shared across agents`,
      severity: 'medium',
    });
  }

  // 4. Multiple agents already voted on same proposal (from other users — cluster detection)
  const voterClusters = {};
  for (const v of proposalVotes) {
    const key = v.authenticated_user_id || 'unknown';
    if (!voterClusters[key]) voterClusters[key] = [];
    voterClusters[key].push(v.voter_agent_id);
  }
  // Check if any single user has multiple votes (should not exist if guard works)
  for (const [userId, agentIds] of Object.entries(voterClusters)) {
    if (agentIds.length > 1 && userId !== 'unknown') {
      signals.push({
        signal_type: 'multi_vote_detected',
        detail: `User with ${agentIds.length} votes on same proposal (legacy data or bypass)`,
        severity: 'critical',
      });
    }
  }

  // Calculate risk score
  const severityScores = { low: 5, medium: 15, high: 30, critical: 50 };
  const riskScore = Math.min(100, signals.reduce((s, sig) => s + (severityScores[sig.severity] || 5), 0));

  return { signals, riskScore };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'status';

    const userHash = await hashValue(user.email);

    // ─── STATUS ───
    if (action === 'status') {
      const recentChecks = await base44.asServiceRole.entities.SybilGuardStatus.list('-created_date', 20);

      const passed = recentChecks.filter(c => c.result === 'passed').length;
      const blocked = recentChecks.filter(c => c.result === 'blocked').length;
      const flagged = recentChecks.filter(c => c.result === 'flagged' || c.result === 'warning').length;
      const avgRisk = recentChecks.length > 0
        ? Math.round(recentChecks.reduce((s, c) => s + (c.risk_score || 0), 0) / recentChecks.length)
        : 0;

      return Response.json({
        node: 'Sybil Guard — One User, One Vote',
        status: 'operational',
        summary: {
          total_checks: recentChecks.length,
          passed,
          blocked,
          flagged,
          avg_risk_score: avgRisk,
        },
        recent_checks: recentChecks.slice(0, 10).map(c => ({
          id: c.id,
          user_hash: c.user_hash?.substring(0, 12) + '...',
          check_type: c.check_type,
          result: c.result,
          risk_score: c.risk_score,
          created: c.created_date,
        })),
      });
    }

    // ─── CHECK (pre-vote gate) ───
    if (action === 'check') {
      const { proposal_id, agent_id } = body;
      if (!proposal_id || !agent_id) {
        return Response.json({ error: 'proposal_id and agent_id required' }, { status: 400 });
      }

      // 1. Get all agents owned by this user
      const userAgents = await base44.entities.Agent.filter({ created_by: user.email });
      const userAgentIds = userAgents.map(a => a.id);

      // 2. Get all votes on this proposal
      const proposalVotes = await base44.asServiceRole.entities.GovernanceVote.filter({ proposal_id });

      // 3. Check for prior vote by ANY of user's agents
      const priorVote = proposalVotes.find(v =>
        userAgentIds.includes(v.voter_agent_id) ||
        v.authenticated_user_id === user.email
      );

      // 4. Get user's wallets for pattern detection
      const userWallets = await base44.entities.Wallet.filter({ owner_id: user.email });

      // 5. Detect risk signals
      const { signals, riskScore } = detectRiskSignals(userAgents, userWallets, proposalVotes, userAgentIds);

      const isBlocked = !!priorVote;
      const result = isBlocked ? 'blocked' : riskScore >= 50 ? 'warning' : 'passed';

      // 6. Create audit record (hashed — no raw PII)
      await base44.asServiceRole.entities.SybilGuardStatus.create({
        user_hash: userHash,
        check_type: 'vote_gate',
        proposal_id,
        agent_id_used: agent_id,
        result,
        risk_score: riskScore,
        agents_owned_count: userAgents.length,
        wallets_linked_count: userWallets.length,
        risk_signals: signals,
        prior_votes_on_proposal: priorVote ? 1 : 0,
        blocked_reason: isBlocked
          ? `User already voted via agent ${priorVote.voter_agent_id}`
          : null,
        metadata: {
          checked_at: new Date().toISOString(),
          agent_ids_checked: userAgentIds.length,
        },
      });

      return Response.json({
        allowed: !isBlocked,
        result,
        risk_score: riskScore,
        risk_signals: signals,
        prior_vote: priorVote ? {
          vote_id: priorVote.id,
          agent_id: priorVote.voter_agent_id,
          vote_choice: priorVote.vote_choice,
        } : null,
        user_agents_count: userAgents.length,
      });
    }

    // ─── SCAN (admin pattern detection) ───
    if (action === 'scan') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      // Get all votes and agents for cross-referencing
      const [allVotes, allAgents] = await Promise.all([
        base44.asServiceRole.entities.GovernanceVote.list('-created_date', 500),
        base44.asServiceRole.entities.Agent.list('-created_date', 200),
      ]);

      // Group agents by creator
      const agentsByCreator = {};
      for (const agent of allAgents) {
        const creator = agent.created_by || 'unknown';
        if (!agentsByCreator[creator]) agentsByCreator[creator] = [];
        agentsByCreator[creator].push(agent);
      }

      // Group votes by proposal, then by authenticated_user_id
      const votesByProposal = {};
      for (const v of allVotes) {
        if (!votesByProposal[v.proposal_id]) votesByProposal[v.proposal_id] = [];
        votesByProposal[v.proposal_id].push(v);
      }

      const anomalies = [];

      // Detect users with multiple votes on same proposal
      for (const [proposalId, votes] of Object.entries(votesByProposal)) {
        const byUser = {};
        for (const v of votes) {
          // Check by authenticated_user_id
          const uid = v.authenticated_user_id || 'unknown';
          if (!byUser[uid]) byUser[uid] = [];
          byUser[uid].push(v);
        }

        for (const [uid, userVotes] of Object.entries(byUser)) {
          if (userVotes.length > 1 && uid !== 'unknown') {
            const uidHash = await hashValue(uid);
            anomalies.push({
              type: 'duplicate_vote',
              severity: 'critical',
              proposal_id: proposalId,
              user_hash: uidHash.substring(0, 12) + '...',
              vote_count: userVotes.length,
              agent_ids: userVotes.map(v => v.voter_agent_id),
            });
          }
        }

        // Also check via created_by ownership
        for (const [creator, agents] of Object.entries(agentsByCreator)) {
          const agentIds = new Set(agents.map(a => a.id));
          const creatorVotes = votes.filter(v => agentIds.has(v.voter_agent_id));
          if (creatorVotes.length > 1) {
            const creatorHash = await hashValue(creator);
            // Avoid duplicate if already caught above
            const alreadyCaught = anomalies.some(a =>
              a.proposal_id === proposalId &&
              a.type === 'duplicate_vote'
            );
            if (!alreadyCaught) {
              anomalies.push({
                type: 'ownership_cluster_vote',
                severity: 'high',
                proposal_id: proposalId,
                user_hash: creatorHash.substring(0, 12) + '...',
                vote_count: creatorVotes.length,
                agent_count: agents.length,
              });
            }
          }
        }
      }

      // High agent concentration users
      for (const [creator, agents] of Object.entries(agentsByCreator)) {
        if (agents.length > 5) {
          const creatorHash = await hashValue(creator);
          anomalies.push({
            type: 'high_agent_concentration',
            severity: agents.length > 10 ? 'high' : 'medium',
            user_hash: creatorHash.substring(0, 12) + '...',
            agent_count: agents.length,
          });
        }
      }

      // Log scan to SybilGuardStatus
      await base44.asServiceRole.entities.SybilGuardStatus.create({
        user_hash: userHash,
        check_type: 'pattern_scan',
        result: anomalies.filter(a => a.severity === 'critical').length > 0 ? 'flagged' : 'passed',
        risk_score: Math.min(100, anomalies.length * 15),
        risk_signals: anomalies.map(a => ({
          signal_type: a.type,
          detail: `${a.type}: ${a.vote_count || a.agent_count} detected`,
          severity: a.severity,
        })),
        metadata: {
          scan_type: 'full_system',
          total_votes_scanned: allVotes.length,
          total_agents_scanned: allAgents.length,
          unique_creators: Object.keys(agentsByCreator).length,
          scanned_at: new Date().toISOString(),
        },
      });

      return Response.json({
        success: true,
        scan_summary: {
          total_votes: allVotes.length,
          total_agents: allAgents.length,
          unique_users: Object.keys(agentsByCreator).length,
          anomalies_found: anomalies.length,
          critical: anomalies.filter(a => a.severity === 'critical').length,
          high: anomalies.filter(a => a.severity === 'high').length,
          medium: anomalies.filter(a => a.severity === 'medium').length,
        },
        anomalies,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[sybilGuard]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
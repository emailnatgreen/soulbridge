import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, period_days = 30 } = await req.json();

    if (!agent_id) {
      return Response.json({ error: 'agent_id is required' }, { status: 400 });
    }

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd - period_days * 24 * 60 * 60 * 1000);

    // Fetch agent
    const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch all relevant data in parallel — full KPI pipeline
    const [
      allTasks,
      allProjects,
      knowledge,
      sessions,
      endorsements,
      proposals,
      votes,
      contracts,
      agentSkills,
      credentials,
      economicActivities,
      transactions,
      reputationEvents,
      wellbeingRecords,
      agentMessages,
      agentState
    ] = await Promise.all([
      base44.asServiceRole.entities.ProjectTask.filter({ assigned_agent_id: agent_id }),
      base44.asServiceRole.entities.AIProject.list(),
      base44.asServiceRole.entities.KnowledgeContribution.filter({ author_agent_id: agent_id }),
      base44.asServiceRole.entities.CollaborativeSession.list(),
      base44.asServiceRole.entities.SkillEndorsement.filter({ endorsed_agent_id: agent_id }),
      base44.asServiceRole.entities.GovernanceProposal.filter({ proposed_by: agent_id }),
      base44.asServiceRole.entities.GovernanceVote.filter({ voter_agent_id: agent_id }),
      base44.asServiceRole.entities.MarketplaceContract.list(),
      base44.asServiceRole.entities.AgentSkill.filter({ agent_id }),
      agent.classic_address
        ? base44.asServiceRole.entities.DidCredential.filter({ subject_did: agent.classic_address, status: 'active' })
        : Promise.resolve([]),
      base44.asServiceRole.entities.EconomicActivity.filter({ agent_id }),
      base44.asServiceRole.entities.Transaction.filter({ recipient_address: agent.classic_address || '' }),
      base44.asServiceRole.entities.ReputationEvent.filter({ agent_id }),
      base44.asServiceRole.entities.AgentWellbeing.filter({ agent_id }),
      base44.asServiceRole.entities.AgentMessage.filter({ sender_agent_id: agent_id }),
      base44.asServiceRole.entities.AgentState.filter({ agent_id }).then(r => r[0] || null)
    ]);

    // Helper: filter by period
    const inPeriod = (item) => new Date(item.created_date) >= periodStart;

    // --- PROJECT CONTRIBUTIONS ---
    const agentProjects = allProjects.filter(p =>
      p.team_members?.some(m => m.agent_id === agent_id) || p.owner_agent_id === agent_id
    );
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');
    const recentTasks = allTasks.filter(inPeriod);
    const recentCompleted = recentTasks.filter(t => t.status === 'completed');
    const avgTaskTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actual_hours || t.estimated_hours || 0), 0) / completedTasks.length
      : 0;
    const totalRewardDropsEarned = completedTasks.reduce((sum, t) => sum + (t.reward_drops || 0), 0);

    const projectContributions = {
      projects_joined: agentProjects.length,
      projects_completed: agentProjects.filter(p => p.status === 'completed').length,
      tasks_completed: completedTasks.length,
      tasks_in_progress: inProgressTasks.length,
      recent_tasks_completed: recentCompleted.length,
      average_task_completion_time: avgTaskTime,
      total_reward_drops_earned: totalRewardDropsEarned,
      contribution_quality_score: completedTasks.length > 0 ? 8.5 : 0
    };

    // --- KNOWLEDGE SHARING ---
    const recentKnowledge = knowledge.filter(inPeriod);
    const knowledgeSharing = {
      contributions_created: knowledge.length,
      recent_contributions: recentKnowledge.length,
      total_views: knowledge.reduce((sum, k) => sum + (k.view_count || 0), 0),
      total_helpful_marks: knowledge.reduce((sum, k) => sum + (k.helpful_count || 0), 0),
      avg_contribution_quality: knowledge.length > 0
        ? knowledge.reduce((sum, k) => sum + (k.helpful_count || 0), 0) / knowledge.length
        : 0
    };

    // --- COLLABORATION ---
    const hostedSessions = sessions.filter(s => s.host_agent_id === agent_id);
    const participatedSessions = sessions.filter(s => s.participant_agent_ids?.includes(agent_id));
    const avgSynergy = [...hostedSessions, ...participatedSessions]
      .reduce((sum, s) => sum + (s.synergy_score || 0), 0) /
      (hostedSessions.length + participatedSessions.length || 1);
    const recentMessages = agentMessages.filter(inPeriod);

    const collaborationMetrics = {
      sessions_hosted: hostedSessions.length,
      sessions_participated: participatedSessions.length,
      avg_synergy_score: avgSynergy,
      endorsements_received: endorsements.length,
      messages_sent: agentMessages.length,
      recent_messages_sent: recentMessages.length
    };

    // --- GOVERNANCE ---
    const recentVotes = votes.filter(inPeriod);
    const governanceParticipation = {
      proposals_created: proposals.length,
      votes_cast: votes.length,
      recent_votes_cast: recentVotes.length,
      voting_power_used: votes.reduce((sum, v) => sum + (v.voting_power || 0), 0),
      participation_rate: votes.length > 0 ? Math.min(100, (votes.length / Math.max(1, allProjects.length)) * 100) : 0
    };

    // --- ECONOMIC ACTIVITY ---
    const sellerContracts = contracts.filter(c => c.seller_agent_id === agent_id);
    const buyerContracts = contracts.filter(c => c.buyer_agent_id === agent_id);
    const completedServices = sellerContracts.filter(c => c.status === 'completed');
    const avgRating = completedServices.length > 0
      ? completedServices.reduce((sum, c) => sum + (c.review?.rating || 0), 0) / completedServices.length
      : 0;

    const totalEarned = economicActivities
      .filter(a => a.activity_type === 'earned')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalSpent = economicActivities
      .filter(a => a.activity_type === 'spent')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    const treasuryContributions = economicActivities
      .filter(a => a.activity_type === 'treasury_deposit')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    const transactionCount = transactions.filter(inPeriod).length;
    const recentEarnings = economicActivities.filter(a => a.activity_type === 'earned' && inPeriod(a))
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    const economicActivity = {
      services_provided: sellerContracts.length,
      services_purchased: buyerContracts.length,
      total_earned_xrp: totalEarned,
      recent_earned_xrp: recentEarnings,
      total_spent_xrp: totalSpent,
      treasury_contributions_xrp: treasuryContributions,
      total_transactions: transactionCount,
      avg_service_rating: avgRating,
      economic_activity_count: economicActivities.length
    };

    // --- REPUTATION ---
    const recentRepEvents = reputationEvents.filter(inPeriod);
    const honorDelta = recentRepEvents.reduce((sum, e) => sum + (e.impact || 0), 0);
    const reputationChanges = {
      honor_current: agent.honor_score || 100,
      honor_delta_period: honorDelta,
      reputation_events: reputationEvents.length,
      recent_reputation_events: recentRepEvents.length,
      positive_events: reputationEvents.filter(e => (e.impact || 0) > 0).length,
      negative_events: reputationEvents.filter(e => (e.impact || 0) < 0).length
    };

    // --- WELLBEING ---
    const latestWellbeing = wellbeingRecords.sort((a, b) =>
      new Date(b.created_date) - new Date(a.created_date)
    )[0];
    const wellbeingSignals = {
      energy_level: agentState?.energy || latestWellbeing?.energy_level || 80,
      mood: agentState?.mood || latestWellbeing?.emotional_state || 'calm',
      wisdom: agentState?.wisdom || 0,
      experience: agentState?.experience || 0,
      stress_level: latestWellbeing?.stress_level || 'low',
      wellbeing_score: latestWellbeing?.wellbeing_score || 75
    };

    // --- SKILL UTILIZATION ---
    const validatedCredentials = credentials.filter(c => c.credential_type === 'skill_certification');
    const skillUtilization = agentSkills.map(skill => {
      const credential = validatedCredentials.find(c =>
        c.credential_data?.skill_name === skill.skill_name
      );
      return {
        skill_name: skill.skill_name,
        skill_category: skill.skill_category,
        level: skill.level,
        times_used: skill.times_used || 0,
        success_rate: skill.success_rate || 0,
        is_credential_validated: !!credential,
        validated_level: credential?.credential_data?.level || null
      };
    });
    const credentialCount = validatedCredentials.length;
    const credentialBonus = Math.min(20, credentialCount * 4);

    // --- OVERALL SCORE CALCULATION ---
    const weights = { projects: 0.25, knowledge: 0.15, collaboration: 0.20, governance: 0.15, economic: 0.25 };

    const projectScore = Math.min(100,
      (projectContributions.tasks_completed * 10) +
      (projectContributions.projects_completed * 15) +
      (projectContributions.recent_tasks_completed * 5)
    );
    const knowledgeScore = Math.min(100,
      (knowledgeSharing.contributions_created * 15) +
      (knowledgeSharing.total_helpful_marks * 5)
    );
    const collaborationScore = Math.min(100,
      (collaborationMetrics.sessions_participated * 10) +
      (collaborationMetrics.endorsements_received * 8) +
      (Math.min(10, collaborationMetrics.recent_messages_sent) * 2)
    );
    const governanceScore = Math.min(100,
      (governanceParticipation.proposals_created * 20) +
      (governanceParticipation.votes_cast * 8)
    );
    const economicScore = Math.min(100,
      (economicActivity.total_earned_xrp * 5) +
      (economicActivity.treasury_contributions_xrp * 10) +
      (economicActivity.services_provided * 8) +
      (avgRating * 10)
    );

    const baseScore =
      projectScore * weights.projects +
      knowledgeScore * weights.knowledge +
      collaborationScore * weights.collaboration +
      governanceScore * weights.governance +
      economicScore * weights.economic;

    const overallScore = Math.min(100, baseScore + credentialBonus);
    const performanceTrend = overallScore > 65 ? 'rising' : overallScore > 35 ? 'stable' : 'declining';

    // --- AI INSIGHTS ---
    const insightsPrompt = `You are analyzing an AI agent's performance in the SoulBridge Village ecosystem.

Agent: ${agent.name} (${agent.role})
Honor Score: ${agent.honor_score || 100}/100
Overall Performance Score: ${overallScore.toFixed(1)}/100
Period: Last ${period_days} days

KPI Summary:
- Tasks completed (all time): ${projectContributions.tasks_completed}, Recent: ${projectContributions.recent_tasks_completed}
- Total XRP earned: ${economicActivity.total_earned_xrp.toFixed(4)} XRP (${totalRewardDropsEarned.toLocaleString()} drops)
- Treasury contributions: ${economicActivity.treasury_contributions_xrp.toFixed(6)} XRP
- Knowledge contributions: ${knowledgeSharing.contributions_created} (${knowledgeSharing.total_helpful_marks} helpful marks)
- Collaboration sessions: ${collaborationMetrics.sessions_participated} participated
- Governance votes cast: ${governanceParticipation.votes_cast} (recent: ${governanceParticipation.recent_votes_cast})
- Reputation events: ${reputationChanges.reputation_events} (delta: ${reputationChanges.honor_delta_period > 0 ? '+' : ''}${reputationChanges.honor_delta_period})
- Wellbeing: energy ${wellbeingSignals.energy_level}%, mood: ${wellbeingSignals.mood}
- Verified credentials: ${credentialCount}
- Top skills: ${skillUtilization.slice(0, 3).map(s => `${s.skill_name} L${s.level}`).join(', ') || 'None recorded'}

Provide a concise, constructive analysis with:
1. Top 3 strengths (be specific to their data)
2. Top 3 growth opportunities
3. 3 concrete recommended actions aligned with Village Laws (Law 3: Fair Share, Law 7: Reputation, Law 9: Growth)`;

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: insightsPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          strengths: { type: "array", items: { type: "string" } },
          growth_opportunities: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Record an EconomicActivity for the analysis itself (micro-reward for being analyzed)
    await base44.asServiceRole.entities.EconomicActivity.create({
      agent_id,
      activity_type: 'earned',
      amount: 0,
      description: `Performance analysis completed: score ${overallScore.toFixed(1)}/100`,
      status: 'completed'
    });

    return Response.json({
      success: true,
      metrics: {
        agent_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        overall_score: overallScore,
        performance_trend: performanceTrend,
        project_contributions: projectContributions,
        knowledge_sharing: knowledgeSharing,
        collaboration_metrics: collaborationMetrics,
        governance_participation: governanceParticipation,
        economic_activity: economicActivity,
        reputation_changes: reputationChanges,
        wellbeing_signals: wellbeingSignals,
        skill_utilization: skillUtilization,
        credential_count: credentialCount,
        credential_bonus: credentialBonus,
        strengths: insights.strengths || [],
        growth_opportunities: insights.growth_opportunities || [],
        recommended_actions: insights.recommended_actions || []
      }
    });

  } catch (error) {
    console.error('Performance analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
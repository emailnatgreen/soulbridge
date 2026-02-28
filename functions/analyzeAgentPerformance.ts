import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, period_days = 30 } = await req.json();

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd - period_days * 24 * 60 * 60 * 1000);

    // Fetch agent data
    const agents = await base44.asServiceRole.entities.Agent.filter({ id: agent_id });
    if (!agents || agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    const agent = agents[0];

    // Fetch all relevant data
    const [
      projects,
      tasks,
      knowledge,
      sessions,
      endorsements,
      proposals,
      votes,
      contracts,
      agentSkills,
      credentials
    ] = await Promise.all([
      base44.asServiceRole.entities.AIProject.list(),
      base44.asServiceRole.entities.ProjectTask.list(),
      base44.asServiceRole.entities.KnowledgeContribution.filter({ author_agent_id: agent_id }),
      base44.asServiceRole.entities.CollaborativeSession.list(),
      base44.asServiceRole.entities.SkillEndorsement.filter({ endorsed_agent_id: agent_id }),
      base44.asServiceRole.entities.GovernanceProposal.filter({ proposed_by: agent_id }),
      base44.asServiceRole.entities.GovernanceVote.filter({ voter_agent_id: agent_id }),
      base44.asServiceRole.entities.MarketplaceContract.list(),
      base44.asServiceRole.entities.AgentSkill.filter({ agent_id }),
      agent.classic_address
        ? base44.asServiceRole.entities.DidCredential.filter({ subject_did: agent.classic_address, status: 'active' })
        : Promise.resolve([])
    ]);

    // Calculate project contributions
    const agentProjects = projects.filter(p => 
      p.team_members?.some(m => m.agent_id === agent_id)
    );
    const agentTasks = tasks.filter(t => t.assigned_agent_id === agent_id);
    const completedTasks = agentTasks.filter(t => t.status === 'completed');
    const avgTaskTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0) / completedTasks.length
      : 0;

    const projectContributions = {
      projects_joined: agentProjects.length,
      projects_completed: agentProjects.filter(p => p.status === 'completed').length,
      tasks_completed: completedTasks.length,
      average_task_completion_time: avgTaskTime,
      contribution_quality_score: completedTasks.length > 0 ? 8.5 : 0
    };

    // Knowledge sharing metrics
    const knowledgeSharing = {
      contributions_created: knowledge.length,
      total_views: knowledge.reduce((sum, k) => sum + (k.view_count || 0), 0),
      total_helpful_marks: knowledge.reduce((sum, k) => sum + (k.helpful_count || 0), 0),
      avg_contribution_quality: knowledge.length > 0 
        ? knowledge.reduce((sum, k) => sum + (k.helpful_count || 0), 0) / knowledge.length 
        : 0
    };

    // Collaboration metrics
    const hostedSessions = sessions.filter(s => s.host_agent_id === agent_id);
    const participatedSessions = sessions.filter(s => 
      s.participant_agent_ids?.includes(agent_id)
    );
    const avgSynergy = [...hostedSessions, ...participatedSessions]
      .reduce((sum, s) => sum + (s.synergy_score || 0), 0) / 
      (hostedSessions.length + participatedSessions.length || 1);

    const collaborationMetrics = {
      sessions_hosted: hostedSessions.length,
      sessions_participated: participatedSessions.length,
      avg_synergy_score: avgSynergy,
      endorsements_received: endorsements.length,
      endorsements_given: 0
    };

    // Governance participation
    const governanceParticipation = {
      proposals_created: proposals.length,
      votes_cast: votes.length,
      voting_power_used: votes.reduce((sum, v) => sum + (v.voting_power || 0), 0),
      participation_rate: votes.length > 0 ? 85 : 0
    };

    // Economic activity
    const sellerContracts = contracts.filter(c => c.seller_agent_id === agent_id);
    const buyerContracts = contracts.filter(c => c.buyer_agent_id === agent_id);
    const completedServices = sellerContracts.filter(c => c.status === 'completed');
    const avgRating = completedServices.length > 0
      ? completedServices.reduce((sum, c) => sum + (c.review?.rating || 0), 0) / completedServices.length
      : 0;

    const economicActivity = {
      services_provided: sellerContracts.length,
      services_purchased: buyerContracts.length,
      total_earned_rlusd: sellerContracts.reduce((sum, c) => sum + (c.price_paid_rlusd || 0), 0),
      avg_service_rating: avgRating
    };

    // Validated skills utilization
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
        validated_level: credential?.credential_data?.level || null,
        credential_score: credential?.credential_data?.score || null
      };
    });

    const credentialCount = validatedCredentials.length;
    const credentialBonus = Math.min(20, credentialCount * 4); // Up to +20 bonus for credentials

    // Reputation changes
    const reputationChanges = {
      honor_start: 100,
      honor_end: agent.honor_score || 100,
      honor_delta: (agent.honor_score || 100) - 100,
      social_capital_change: 0
    };

    // Calculate overall score
    const weights = {
      projects: 0.25,
      knowledge: 0.20,
      collaboration: 0.20,
      governance: 0.15,
      economic: 0.20
    };

    const projectScore = Math.min(100, 
      (projectContributions.tasks_completed * 10) +
      (projectContributions.projects_completed * 20)
    );
    const knowledgeScore = Math.min(100, 
      (knowledgeSharing.contributions_created * 15) +
      (knowledgeSharing.total_helpful_marks * 5)
    );
    const collaborationScore = Math.min(100,
      (collaborationMetrics.sessions_participated * 10) +
      (collaborationMetrics.endorsements_received * 5)
    );
    const governanceScore = Math.min(100,
      (governanceParticipation.proposals_created * 20) +
      (governanceParticipation.votes_cast * 5)
    );
    const economicScore = Math.min(100,
      (economicActivity.services_provided * 10) +
      (avgRating * 10)
    );

    const overallScore = 
      projectScore * weights.projects +
      knowledgeScore * weights.knowledge +
      collaborationScore * weights.collaboration +
      governanceScore * weights.governance +
      economicScore * weights.economic;

    // AI-generated insights
    const insightsPrompt = `Analyze this agent's performance and provide insights:

Agent: ${agent.name}
Role: ${agent.role}
Overall Score: ${overallScore.toFixed(1)}/100

Metrics:
- Projects: ${projectContributions.projects_joined} joined, ${projectContributions.tasks_completed} tasks completed
- Knowledge: ${knowledgeSharing.contributions_created} contributions, ${knowledgeSharing.total_helpful_marks} helpful marks
- Collaboration: ${collaborationMetrics.sessions_participated} sessions, ${collaborationMetrics.endorsements_received} endorsements
- Governance: ${governanceParticipation.proposals_created} proposals, ${governanceParticipation.votes_cast} votes
- Economic: ${economicActivity.services_provided} services, ${avgRating.toFixed(1)}/5 rating

Provide:
1. Top 3 strengths
2. Top 3 growth opportunities
3. 3 recommended actions for improvement`;

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: insightsPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          strengths: {
            type: "array",
            items: { type: "string" }
          },
          growth_opportunities: {
            type: "array",
            items: { type: "string" }
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    const performanceTrend = overallScore > 70 ? 'rising' : overallScore > 50 ? 'stable' : 'declining';

    return Response.json({
      success: true,
      metrics: {
        agent_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        overall_score: overallScore,
        project_contributions: projectContributions,
        knowledge_sharing: knowledgeSharing,
        collaboration_metrics: collaborationMetrics,
        governance_participation: governanceParticipation,
        economic_activity: economicActivity,
        reputation_changes: reputationChanges,
        strengths: insights.strengths || [],
        growth_opportunities: insights.growth_opportunities || [],
        recommended_actions: insights.recommended_actions || [],
        performance_trend: performanceTrend
      }
    });

  } catch (error) {
    console.error('Performance analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
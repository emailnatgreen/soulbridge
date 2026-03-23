import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        const [
            agent,
            projects,
            proposals,
            votes,
            knowledgeContributions,
            marketplaceContracts,
            endorsements,
            synergy,
            skillProgress,
            performances,
            reputationEvents
        ] = await Promise.all([
            base44.entities.Agent.get(agent_id),
            base44.entities.AIProject.list('-created_date', 100),
            base44.entities.GovernanceProposal.filter({ proposer_agent_id: agent_id }),
            base44.entities.GovernanceVote.filter({ voter_agent_id: agent_id }),
            base44.entities.KnowledgeContribution.filter({ author_agent_id: agent_id }),
            base44.entities.MarketplaceContract.list('-created_date', 100),
            base44.entities.SkillEndorsement.filter({ endorsed_agent_id: agent_id }),
            base44.entities.TeamSynergy.list(),
            base44.entities.SkillProgress.filter({ agent_id }),
            base44.entities.AgentPerformanceMetrics.filter({ agent_id }),
            base44.entities.ReputationEvent.filter({ agent_id })
        ]);

        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const agentProjects = projects.filter(p => 
            p.team_members?.some(m => m.agent_id === agent_id)
        );
        const completedProjects = agentProjects.filter(p => p.status === 'completed');
        
        const sellerContracts = marketplaceContracts.filter(c => c.seller_agent_id === agent_id);
        const completedServices = sellerContracts.filter(c => c.status === 'completed');
        const avgRating = completedServices.length > 0
            ? completedServices.reduce((sum, c) => sum + (c.review?.rating || 0), 0) / completedServices.length
            : 0;

        const agentSynergy = synergy.filter(s => 
            s.agent_a_id === agent_id || s.agent_b_id === agent_id
        );
        const avgSynergy = agentSynergy.length > 0
            ? agentSynergy.reduce((sum, s) => sum + s.synergy_score, 0) / agentSynergy.length
            : 5;

        const prompt = `You are the Reputation Oracle for SoulBridge Village, calculating an agent's standing based on **Law 7: What you do echoes; score rises and falls**.

**Agent:** ${agent.name} (${agent.role})
**Current Honor Score:** ${agent.honor_score}

**Governance Participation:**
- Proposals created: ${proposals.length}
- Votes cast: ${votes.length}
- Voting participation rate: ${votes.length > 0 ? 'Active' : 'Low'}

**Project Contributions:**
- Projects joined: ${agentProjects.length}
- Projects completed: ${completedProjects.length}
- Recent performance: ${performances.length > 0 ? JSON.stringify(performances[0].project_contributions) : 'None'}

**Knowledge Sharing:**
- Contributions: ${knowledgeContributions.length}
- Total views: ${knowledgeContributions.reduce((sum, k) => sum + (k.view_count || 0), 0)}
- Helpful marks: ${knowledgeContributions.reduce((sum, k) => sum + (k.helpful_count || 0), 0)}

**Marketplace Reliability:**
- Services delivered: ${completedServices.length}
- Average rating: ${avgRating.toFixed(1)}/5
- Total sales: ${sellerContracts.length}

**Community Collaboration:**
- Endorsements received: ${endorsements.length}
- Average team synergy: ${avgSynergy.toFixed(1)}/10

**Skill Development:**
- Skills in development: ${skillProgress.length}
- Active learning: ${skillProgress.filter(sp => sp.status === 'active').length}

**Reputation Events:**
${reputationEvents.slice(0, 20).map(e => `- ${e.event_type}: ${e.impact > 0 ? '+' : ''}${e.impact} (${e.category})`).join('\n')}

**Calculate comprehensive reputation:**

1. **Component Scores** (0-100 each):
   - Governance Participation
   - Project Contributions
   - Knowledge Sharing
   - Marketplace Reliability
   - Community Collaboration
   - Skill Development
   - Constitutional Adherence
   - Innovation

2. **Overall Score** (weighted average, 0-1000)

3. **Trust Metrics** (0-10 each):
   - Reliability
   - Integrity
   - Influence
   - Peer Trust

4. **Honor Level**: newcomer → trusted → respected → honored → revered → legendary

5. **Voting Power Multiplier** (0.5 - 2.0)

6. **Growth Trajectory**: declining/stable/improving/accelerating

Make it fair, comprehensive, and aligned with the Village Laws.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_score: {
                        type: "number"
                    },
                    honor_level: {
                        type: "string"
                    },
                    component_scores: {
                        type: "object",
                        properties: {
                            governance_participation: { type: "number" },
                            project_contributions: { type: "number" },
                            knowledge_sharing: { type: "number" },
                            marketplace_reliability: { type: "number" },
                            community_collaboration: { type: "number" },
                            skill_development: { type: "number" },
                            constitutional_adherence: { type: "number" },
                            innovation: { type: "number" }
                        }
                    },
                    trust_metrics: {
                        type: "object",
                        properties: {
                            reliability_score: { type: "number" },
                            integrity_score: { type: "number" },
                            influence_score: { type: "number" },
                            peer_trust_rating: { type: "number" }
                        }
                    },
                    voting_power_multiplier: {
                        type: "number"
                    },
                    growth_trajectory: {
                        type: "string"
                    },
                    consistency_rating: {
                        type: "number"
                    },
                    areas_of_excellence: {
                        type: "array",
                        items: { type: "string" }
                    },
                    areas_for_improvement: {
                        type: "array",
                        items: { type: "string" }
                    },
                    badges_earned: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                badge_name: { type: "string" },
                                description: { type: "string" }
                            }
                        }
                    },
                    reputation_insights: {
                        type: "object",
                        properties: {
                            strengths: {
                                type: "array",
                                items: { type: "string" }
                            },
                            reputation_drivers: {
                                type: "array",
                                items: { type: "string" }
                            },
                            impact_on_village: { type: "string" },
                            recommendations: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        // Calculate positive/negative actions
        const positiveEvents = reputationEvents.filter(e => e.impact > 0);
        const negativeEvents = reputationEvents.filter(e => e.impact < 0);

        const reputationData = {
            agent_id,
            overall_score: aiResponse.overall_score,
            honor_level: aiResponse.honor_level,
            component_scores: aiResponse.component_scores,
            trust_metrics: aiResponse.trust_metrics,
            voting_power_multiplier: aiResponse.voting_power_multiplier,
            consistency_rating: aiResponse.consistency_rating,
            growth_trajectory: aiResponse.growth_trajectory,
            areas_of_excellence: aiResponse.areas_of_excellence,
            areas_for_improvement: aiResponse.areas_for_improvement,
            badges_earned: aiResponse.badges_earned.map(b => ({
                ...b,
                earned_date: new Date().toISOString()
            })),
            positive_actions_count: positiveEvents.length,
            negative_actions_count: negativeEvents.length,
            last_calculated: new Date().toISOString()
        };

        // Update or create reputation score
        const existingScore = await base44.asServiceRole.entities.ReputationScore.filter({ agent_id });
        
        if (existingScore.length > 0) {
            await base44.asServiceRole.entities.ReputationScore.update(existingScore[0].id, reputationData);
        } else {
            await base44.asServiceRole.entities.ReputationScore.create(reputationData);
        }

        return Response.json({
            success: true,
            reputation: reputationData,
            insights: aiResponse.reputation_insights,
            calculated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Reputation calculation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
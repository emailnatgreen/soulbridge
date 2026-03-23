import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [proposals, votes, agents, delegations] = await Promise.all([
            base44.entities.GovernanceProposal.list('-created_date', 200),
            base44.entities.GovernanceVote.list('-created_date', 500),
            base44.entities.Agent.list(),
            base44.entities.VotingDelegation.filter({ is_active: true })
        ]);

        // Calculate participation metrics
        const activeProposals = proposals.filter(p => p.status === 'active');
        const completedProposals = proposals.filter(p => ['approved', 'rejected', 'executed'].includes(p.status));
        
        const participationRates = completedProposals.map(p => {
            const proposalVotes = votes.filter(v => v.proposal_id === p.id);
            return (proposalVotes.length / agents.length) * 100;
        });
        
        const avgParticipation = participationRates.length > 0
            ? participationRates.reduce((a, b) => a + b, 0) / participationRates.length
            : 0;

        // Voting power distribution
        const votingPowerDistribution = agents.map(agent => {
            const agentVotes = votes.filter(v => v.voter_agent_id === agent.id);
            const delegationsReceived = delegations.filter(d => d.delegate_agent_id === agent.id);
            return {
                agent_id: agent.id,
                direct_votes: agentVotes.length,
                delegations_received: delegationsReceived.length,
                effective_power: agentVotes.length + delegationsReceived.length
            };
        });

        // Proposal success analysis
        const approvedProposals = proposals.filter(p => p.status === 'approved' || p.status === 'executed');
        const successRate = proposals.length > 0 ? (approvedProposals.length / proposals.length) * 100 : 0;

        const prompt = `You are an AI governance analyst for SoulBridge Village's decentralized democracy.

**Governance Statistics:**
- Total Proposals: ${proposals.length}
- Active Proposals: ${activeProposals.length}
- Approval Rate: ${successRate.toFixed(1)}%
- Average Participation: ${avgParticipation.toFixed(1)}%
- Total Agents: ${agents.length}
- Active Delegations: ${delegations.length}

**Voting Power Distribution:**
${JSON.stringify(votingPowerDistribution.slice(0, 10), null, 2)}

**Recent Proposal Topics:**
${proposals.slice(0, 15).map(p => `- [${p.status}] ${p.title} (Category: ${p.category})`).join('\n')}

Analyze the health and effectiveness of this governance system:

1. **Participation Health:** Is engagement adequate? Are decisions representative?
2. **Power Distribution:** Is voting power concentrated or well-distributed?
3. **Decision Quality:** Are proposals well-considered? Success/failure patterns?
4. **Delegation Network:** Is delegation strengthening or weakening direct participation?
5. **Category Balance:** Are all governance areas being addressed?
6. **Potential Issues:** Voter fatigue, power concentration, low engagement?

Provide comprehensive analysis with actionable recommendations.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_health_score: { type: "number" },
                    health_rating: { type: "string" },
                    strengths: {
                        type: "array",
                        items: { type: "string" }
                    },
                    concerns: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                issue: { type: "string" },
                                severity: { type: "string" },
                                recommendation: { type: "string" }
                            }
                        }
                    },
                    participation_analysis: {
                        type: "object",
                        properties: {
                            trend: { type: "string" },
                            quality: { type: "string" },
                            insights: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    },
                    power_distribution_analysis: {
                        type: "object",
                        properties: {
                            concentration_level: { type: "string" },
                            is_healthy: { type: "boolean" },
                            concerns: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    },
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                priority: { type: "string" },
                                recommendation: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            governance_health: aiResponse,
            metrics: {
                total_proposals: proposals.length,
                active_proposals: activeProposals.length,
                avg_participation: avgParticipation,
                success_rate: successRate,
                total_agents: agents.length,
                active_delegations: delegations.length
            },
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Governance analysis error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
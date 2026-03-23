import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { proposal_id } = await req.json();

        const proposal = await base44.entities.GovernanceProposal.get(proposal_id);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        // Gather comprehensive system state
        const [agents, projects, marketplace, productions, treasury, performances] = await Promise.all([
            base44.entities.Agent.list(),
            base44.entities.AIProject.list('-created_date', 100),
            base44.entities.ResourceListing.list('-created_date', 100),
            base44.entities.ProductionChain.list('-created_date', 100),
            base44.entities.Treasury.list(),
            base44.entities.AgentPerformanceMetrics.list('-created_date', 50)
        ]);

        const prompt = `You are an AI impact assessor for SoulBridge Village governance.

**Proposal Under Review:**
${JSON.stringify({
    title: proposal.title,
    description: proposal.description,
    category: proposal.category,
    proposed_by: proposal.proposer_agent_id,
    proposed_changes: proposal.proposed_changes
}, null, 2)}

**Current Village State:**
- Total Agents: ${agents.length}
- Active Projects: ${projects.filter(p => p.status === 'active').length}
- Marketplace Listings: ${marketplace.length}
- Production Chains: ${productions.filter(p => p.status === 'active').length}
- Treasury Balance: ${treasury[0]?.balance || 0} RLUSD

**Proposal Category:** ${proposal.category}

Conduct a comprehensive impact assessment across ALL Village systems:

**If Approved:**
1. **Economic Impact:** Effects on marketplace, production, treasury, resource flows
2. **Social Impact:** Effects on agent relationships, honor, roles, collaboration
3. **Project Impact:** Effects on active projects, resource allocation, timelines
4. **Governance Impact:** Precedent setting, constitutional alignment, future proposals
5. **Risk Assessment:** Potential negative consequences, unintended effects

**If Rejected:**
1. What opportunities are lost?
2. What problems remain unaddressed?
3. Alternative approaches to consider?

Provide quantitative estimates where possible (e.g., "affects 15 agents", "impacts 3 active projects").`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    impact_summary: { type: "string" },
                    overall_impact_score: { type: "number" },
                    approval_recommendation: { type: "string" },
                    confidence: { type: "number" },
                    if_approved: {
                        type: "object",
                        properties: {
                            economic_impact: {
                                type: "object",
                                properties: {
                                    description: { type: "string" },
                                    affected_systems: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    estimated_agents_affected: { type: "number" }
                                }
                            },
                            social_impact: {
                                type: "object",
                                properties: {
                                    description: { type: "string" },
                                    relationship_effects: { type: "string" }
                                }
                            },
                            project_impact: {
                                type: "object",
                                properties: {
                                    description: { type: "string" },
                                    affected_projects: { type: "number" }
                                }
                            },
                            risks: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        risk: { type: "string" },
                                        severity: { type: "string" },
                                        mitigation: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    if_rejected: {
                        type: "object",
                        properties: {
                            lost_opportunities: {
                                type: "array",
                                items: { type: "string" }
                            },
                            unaddressed_problems: {
                                type: "array",
                                items: { type: "string" }
                            },
                            alternatives: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    },
                    constitutional_alignment: {
                        type: "object",
                        properties: {
                            aligned_laws: {
                                type: "array",
                                items: { type: "string" }
                            },
                            potential_conflicts: {
                                type: "array",
                                items: { type: "string" }
                            },
                            overall_alignment: { type: "string" }
                        }
                    },
                    stakeholder_analysis: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                group: { type: "string" },
                                impact: { type: "string" },
                                likely_position: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            proposal_id,
            impact_assessment: aiResponse,
            assessed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Impact assessment error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
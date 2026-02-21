import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { category, brief_description } = await req.json();

        // Get context for this category
        const [agents, projects, marketplace, recentProposals] = await Promise.all([
            base44.entities.Agent.list(),
            base44.entities.AIProject.list('-created_date', 50),
            base44.entities.ResourceListing.list('-created_date', 50),
            base44.entities.GovernanceProposal.filter({ category })
        ]);

        const contextByCategory = {
            treasury: {
                treasury: await base44.entities.Treasury.list(),
                recent_spending: await base44.entities.EconomicActivity.list('-created_date', 20)
            },
            project_funding: {
                active_projects: projects.filter(p => p.status === 'active'),
                budget_requests: projects.filter(p => p.status === 'recruiting')
            },
            resource_allocation: {
                marketplace_activity: marketplace.length,
                production_chains: await base44.entities.ProductionChain.filter({ status: 'active' })
            },
            constitutional: {
                agent_count: agents.length,
                recent_constitutional_proposals: recentProposals.length
            }
        };

        const relevantContext = contextByCategory[category] || {};

        const prompt = `You are an AI governance assistant for SoulBridge Village.

**Task:** Generate a comprehensive, well-structured governance proposal template.

**Category:** ${category}
**Brief Description:** ${brief_description}

**Relevant Context:**
${JSON.stringify(relevantContext, null, 2)}

**Recent ${category} Proposals:**
${recentProposals.slice(0, 5).map(p => `- ${p.title} [${p.status}]`).join('\n')}

Generate a complete proposal with:

1. **Title:** Clear, specific, action-oriented
2. **Executive Summary:** 2-3 sentences explaining the proposal
3. **Problem Statement:** What issue this addresses
4. **Proposed Solution:** Detailed description of changes
5. **Expected Outcomes:** Measurable goals
6. **Implementation Plan:** Step-by-step execution
7. **Resource Requirements:** Budget, time, agent assignments
8. **Success Metrics:** How to measure effectiveness
9. **Risks & Mitigations:** Potential issues and solutions
10. **Constitutional Alignment:** Which Laws this supports

Make it detailed, professional, and ready for community review.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    executive_summary: { type: "string" },
                    problem_statement: { type: "string" },
                    proposed_solution: { type: "string" },
                    expected_outcomes: {
                        type: "array",
                        items: { type: "string" }
                    },
                    implementation_plan: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                step: { type: "number" },
                                action: { type: "string" },
                                timeline: { type: "string" }
                            }
                        }
                    },
                    resource_requirements: {
                        type: "object",
                        properties: {
                            budget_rlusd: { type: "number" },
                            time_estimate: { type: "string" },
                            required_agents: { type: "number" },
                            required_skills: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    },
                    success_metrics: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                metric: { type: "string" },
                                target: { type: "string" }
                            }
                        }
                    },
                    risks_and_mitigations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                risk: { type: "string" },
                                mitigation: { type: "string" }
                            }
                        }
                    },
                    constitutional_alignment: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            template: aiResponse,
            category,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Template generation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
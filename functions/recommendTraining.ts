import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { agent_id, recommended_by } = await req.json();
        
        if (!agent_id) {
            return Response.json({ error: 'agent_id required' }, { status: 400 });
        }
        
        // Get agent and state
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        const agentStates = await base44.entities.AgentState.filter({ agent_id });
        const agentState = agentStates[0];
        
        // Get agent's training history
        const completedTrainings = await base44.entities.AgentTraining.filter({ 
            agent_id, 
            status: 'completed' 
        });
        
        const inProgressTrainings = await base44.entities.AgentTraining.filter({ 
            agent_id, 
            status: 'in_progress' 
        });
        
        // Get agent's recent activities
        const contributions = await base44.entities.ProjectContribution.filter({ agent_id });
        const economicActivities = await base44.entities.EconomicActivity.filter({ agent_id });
        
        // Get role requirements for next progression
        const roleHierarchy = {
            citizen: 'guardian/trader/creator',
            guardian: 'elder',
            trader: 'elder',
            creator: 'elder',
            teacher: 'elder',
            healer: 'elder',
            scout: 'elder',
            elder: 'master',
            master: 'master'
        };
        
        const nextRole = roleHierarchy[agent.role] || 'citizen';
        
        // Build context for AI recommendation
        const recommendationContext = `
Analyze this agent's profile and recommend 3-5 training paths that will help them grow:

Agent Profile:
- Name: ${agent.name}
- Current Role: ${agent.role}
- Next Role Target: ${nextRole}
- Honor: ${agent.honor_score}/100
- Experience: ${agentState?.experience || 0}
- Wisdom: ${agentState?.wisdom || 0}
- Purpose: ${agent.purpose}

Development History:
- Completed Trainings: ${completedTrainings.length}
- Training Types Completed: ${completedTrainings.map(t => t.training_type).join(', ') || 'none'}
- In Progress: ${inProgressTrainings.length}
- Project Contributions: ${contributions.length}
- Economic Transactions: ${economicActivities.length}
- Social Connections: ${Object.keys(agentState?.relationships || {}).length}

Recommend training that:
1. Addresses skill gaps for role progression
2. Builds on completed trainings (progressive difficulty)
3. Aligns with agent's purpose and current activities
4. Provides variety across training types
5. Is challenging but achievable given current stats

Return 3-5 specific training recommendations with clear rationale.
`;

        const aiRecommendations = await base44.integrations.Core.InvokeLLM({
            prompt: recommendationContext,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                training_type: { type: "string" },
                                skill_focus: { type: "string" },
                                priority: { type: "string", enum: ["high", "medium", "low"] },
                                rationale: { type: "string" },
                                expected_benefits: { type: "array", items: { type: "string" } },
                                prerequisites_met: { type: "boolean" }
                            }
                        }
                    },
                    overall_assessment: { type: "string" },
                    next_milestone: { type: "string" }
                }
            }
        });
        
        // Store recommendations as Memory if recommended by Axi
        if (recommended_by) {
            await base44.entities.Memory.create({
                agent_id: recommended_by,
                user_id: null,
                type: 'observation',
                content: `Training recommendations for ${agent.name}: ${aiRecommendations.overall_assessment}`,
                keywords: ['training', 'growth', agent.name, 'recommendations'],
                context: `Role: ${agent.role}, targeting ${nextRole}`,
                importance: 7,
                related_entity_id: agent.id,
                related_entity_type: 'Agent'
            });
        }
        
        return Response.json({
            success: true,
            agent_name: agent.name,
            current_role: agent.role,
            target_role: nextRole,
            recommendations: aiRecommendations.recommendations,
            overall_assessment: aiRecommendations.overall_assessment,
            next_milestone: aiRecommendations.next_milestone
        });
        
    } catch (error) {
        console.error('Training recommendation error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});
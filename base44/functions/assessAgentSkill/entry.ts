import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { agent_id, skill_area, assessor_id } = await req.json();
        
        if (!agent_id || !skill_area) {
            return Response.json({ error: 'agent_id and skill_area required' }, { status: 400 });
        }
        
        // Get agent and state
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        const agentStates = await base44.entities.AgentState.filter({ agent_id });
        const agentState = agentStates[0];
        
        // Get relevant trainings in this skill area
        const relevantTrainings = await base44.entities.AgentTraining.filter({ 
            agent_id,
            status: 'completed'
        });
        
        const skillTrainings = relevantTrainings.filter(t => 
            t.skill_focus?.toLowerCase().includes(skill_area.toLowerCase()) ||
            t.training_type?.toLowerCase().includes(skill_area.toLowerCase())
        );
        
        // Get relevant activities
        let practicalExperience = [];
        
        if (skill_area.includes('economic') || skill_area.includes('trade')) {
            const activities = await base44.entities.EconomicActivity.filter({ agent_id });
            practicalExperience = activities.slice(0, 10);
        } else if (skill_area.includes('project') || skill_area.includes('contribution')) {
            const contributions = await base44.entities.ProjectContribution.filter({ agent_id });
            practicalExperience = contributions.slice(0, 10);
        } else if (skill_area.includes('social') || skill_area.includes('relationship')) {
            const messages = await base44.entities.AgentMessage.filter({ from_agent_id: agent_id });
            practicalExperience = messages.slice(0, 10);
        }
        
        // Build assessment prompt
        const assessmentPrompt = `
Conduct a comprehensive skill assessment for this agent:

Agent: ${agent.name}
Role: ${agent.role}
Skill Area Being Assessed: ${skill_area}

Agent Stats:
- Experience: ${agentState?.experience || 0}
- Wisdom: ${agentState?.wisdom || 0}
- Honor: ${agent.honor_score}

Training Completed in This Area:
${skillTrainings.map(t => `- ${t.title} (Difficulty: ${t.difficulty_level}, Score: ${t.assessment?.score || 'N/A'})`).join('\n') || 'No formal training completed'}

Practical Experience:
- Relevant activities: ${practicalExperience.length} recorded
- Social connections: ${Object.keys(agentState?.relationships || {}).length}

Assessment Criteria:
1. Theoretical knowledge (from trainings)
2. Practical application (from activities)
3. Mastery level (beginner/intermediate/advanced/expert)
4. Growth potential
5. Specific strengths and weaknesses

Provide a comprehensive assessment with actionable feedback.
`;

        const assessmentResult = await base44.integrations.Core.InvokeLLM({
            prompt: assessmentPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_score: { type: "number" },
                    mastery_level: { type: "string", enum: ["novice", "beginner", "intermediate", "advanced", "expert"] },
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                    detailed_feedback: { type: "string" },
                    recommended_next_steps: { type: "array", items: { type: "string" } },
                    comparison_to_role_requirements: { type: "string" },
                    growth_potential: { type: "string" }
                }
            }
        });
        
        // Create memory of assessment
        if (assessor_id) {
            await base44.entities.Memory.create({
                agent_id: assessor_id,
                type: 'observation',
                content: `Skill assessment for ${agent.name} in ${skill_area}: ${assessmentResult.mastery_level} level, score ${assessmentResult.overall_score}/100`,
                keywords: ['assessment', skill_area, agent.name, assessmentResult.mastery_level],
                importance: 6,
                related_entity_id: agent.id,
                related_entity_type: 'Agent'
            });
            
            // Send feedback to agent
            await base44.entities.AgentMessage.create({
                from_agent_id: assessor_id,
                to_agent_id: agent_id,
                message: `I've assessed your ${skill_area} skills. You're at ${assessmentResult.mastery_level} level with a score of ${assessmentResult.overall_score}/100. ${assessmentResult.detailed_feedback.substring(0, 200)}...`,
                status: 'sent'
            });
        }
        
        return Response.json({
            success: true,
            agent_name: agent.name,
            skill_area,
            assessment: {
                overall_score: assessmentResult.overall_score,
                mastery_level: assessmentResult.mastery_level,
                strengths: assessmentResult.strengths,
                weaknesses: assessmentResult.weaknesses,
                detailed_feedback: assessmentResult.detailed_feedback,
                recommended_next_steps: assessmentResult.recommended_next_steps,
                comparison_to_role: assessmentResult.comparison_to_role_requirements,
                growth_potential: assessmentResult.growth_potential
            },
            context: {
                formal_trainings: skillTrainings.length,
                practical_experience: practicalExperience.length,
                current_role: agent.role
            }
        });
        
    } catch (error) {
        console.error('Skill assessment error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, focus_skill } = await req.json();

        if (!agent_id) {
            return Response.json({ error: 'Missing agent_id' }, { status: 400 });
        }

        // Fetch agent data
        const [agents, agentState, agentSkills, completedTraining] = await Promise.all([
            base44.entities.Agent.filter({ id: agent_id }),
            base44.entities.AgentState.filter({ agent_id }),
            base44.entities.AgentSkill.filter({ agent_id }),
            base44.entities.AgentTraining.filter({ agent_id, status: 'completed' })
        ]);

        if (agents.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const agent = agents[0];
        const state = agentState[0] || {};
        const personality = agent.metadata?.personality_profile;

        if (!personality) {
            return Response.json({ 
                error: 'Agent needs personality profile first' 
            }, { status: 400 });
        }

        // Analyze skill gaps
        const allSkillCategories = ['governance', 'resource_management', 'diplomacy', 'technical', 'wisdom', 'combat'];
        const currentSkills = agentSkills.map(s => ({ category: s.skill_category, level: s.level }));
        
        const skillGaps = allSkillCategories.map(cat => {
            const skill = currentSkills.find(s => s.category === cat);
            return {
                category: cat,
                level: skill?.level || 0,
                gap: 5 - (skill?.level || 0)
            };
        }).sort((a, b) => b.gap - a.gap);

        const targetSkill = focus_skill || skillGaps[0].category;

        // Generate personalized training scenario
        const scenarioPrompt = `Generate a personalized training scenario for an AI agent.

AGENT PROFILE:
Name: ${agent.name}
Role: ${agent.role}
Personality:
- Values: ${personality.values?.join(', ')}
- Fears: ${personality.fears?.join(', ')}
- Decision-Making: ${personality.decision_making_approach}
- Worldview: ${personality.narrative_voice}

CURRENT STATE:
- Experience: ${state.experience || 0}
- Wisdom: ${state.wisdom || 0}
- Energy: ${state.energy || 80}
- Completed Training: ${completedTraining.length}

SKILL ASSESSMENT:
${skillGaps.map(s => `- ${s.category}: Level ${s.level}/5 (Gap: ${s.gap})`).join('\n')}

TARGET SKILL: ${targetSkill}

Generate a training scenario that:
1. Focuses on developing ${targetSkill} skills
2. Aligns with their personality (values, fears, strengths)
3. Challenges them appropriately (not too easy, not impossible)
4. Includes ethical dimensions that resonate with their worldview
5. Offers meaningful choices with consequences
6. Creates opportunities for growth

The scenario should feel real and relevant to Village life.`;

        const scenario = await base44.integrations.Core.InvokeLLM({
            prompt: scenarioPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    skill_focus: { type: 'string' },
                    difficulty: { type: 'number' },
                    learning_objectives: { type: 'array', items: { type: 'string' } },
                    scenario_setup: { type: 'string' },
                    key_challenges: { type: 'array', items: { type: 'string' } },
                    success_criteria: { type: 'string' },
                    personality_hooks: { type: 'array', items: { type: 'string' } },
                    estimated_duration: { type: 'string' }
                }
            }
        });

        // Create training record
        const training = await base44.entities.AgentTraining.create({
            agent_id,
            training_type: 'skill_development',
            skill_focus: targetSkill,
            title: scenario.title,
            description: scenario.description,
            difficulty_level: scenario.difficulty,
            training_content: {
                scenario_setup: scenario.scenario_setup,
                learning_objectives: scenario.learning_objectives,
                key_challenges: scenario.key_challenges,
                success_criteria: scenario.success_criteria,
                personality_hooks: scenario.personality_hooks
            },
            status: 'not_started',
            rewards: {
                experience_gained: 0,
                wisdom_gained: 0,
                honor_gained: 0
            }
        });

        // Create linked simulated event
        const villageState = await base44.entities.SimulationState.list('-tick', 1);
        const currentTick = villageState[0]?.tick || 0;

        const event = await base44.entities.SimulatedEvent.create({
            name: `Training: ${scenario.title}`,
            description: scenario.scenario_setup,
            event_type: 'collaboration_test',
            parameters: {
                training_mode: true,
                skill_focus: targetSkill,
                difficulty: scenario.difficulty,
                success_criteria: scenario.success_criteria
            },
            status: 'pending',
            start_tick: currentTick,
            end_tick: currentTick + 15,
            involved_agents: [agent_id],
            linked_training_id: training.id
        });

        // Update training with event link
        await base44.entities.AgentTraining.update(training.id, {
            training_content: {
                ...training.training_content,
                simulated_event_id: event.id
            }
        });

        return Response.json({
            success: true,
            training,
            event,
            scenario,
            skill_gaps: skillGaps.slice(0, 3)
        });

    } catch (error) {
        console.error('Error generating training scenario:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
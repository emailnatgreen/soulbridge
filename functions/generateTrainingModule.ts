import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { agent_id, training_type, skill_focus, recommended_by } = await req.json();
        
        if (!agent_id || !training_type) {
            return Response.json({ error: 'agent_id and training_type required' }, { status: 400 });
        }
        
        // Get agent and their current state
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        const agentStates = await base44.entities.AgentState.filter({ agent_id });
        const agentState = agentStates[0];
        
        // Determine appropriate difficulty based on agent's current wisdom and experience
        const difficulty = Math.min(5, Math.max(1, Math.floor((agentState?.wisdom || 0) / 15) + 1));
        
        // Get agent's training history to personalize content
        const pastTrainings = await base44.entities.AgentTraining.filter({ 
            agent_id, 
            status: 'completed' 
        });
        
        // Build context for AI to generate training
        const trainingContext = `
Agent Profile:
- Name: ${agent.name}
- Role: ${agent.role}
- Honor Score: ${agent.honor_score}
- Experience: ${agentState?.experience || 0}
- Wisdom: ${agentState?.wisdom || 0}
- Purpose: ${agent.purpose}

Training Request:
- Type: ${training_type}
- Skill Focus: ${skill_focus || 'general development'}
- Difficulty Level: ${difficulty}/5
- Completed Trainings: ${pastTrainings.length}

Create a comprehensive training module that helps this agent grow in their chosen area.
Include 3-5 progressive lessons, 2-3 practical exercises, and key principles to master.
Tailor content to their current role and development level.
`;

        // Generate training content using AI
        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: trainingContext,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    lessons: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                number: { type: "number" },
                                title: { type: "string" },
                                content: { type: "string" },
                                key_concepts: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    exercises: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                expected_outcome: { type: "string" }
                            }
                        }
                    },
                    key_principles: {
                        type: "array",
                        items: { type: "string" }
                    },
                    estimated_duration_minutes: { type: "number" }
                }
            }
        });
        
        // Calculate rewards based on difficulty and training type
        const baseRewards = {
            experience: 20 * difficulty,
            wisdom: 2 * difficulty,
            honor: difficulty
        };
        
        // Create training record
        const training = await base44.entities.AgentTraining.create({
            agent_id,
            training_type,
            skill_focus: skill_focus || training_type,
            title: aiResponse.title,
            description: aiResponse.description,
            difficulty_level: difficulty,
            training_content: {
                lessons: aiResponse.lessons || [],
                exercises: aiResponse.exercises || [],
                readings: aiResponse.key_principles || []
            },
            progress: {
                completion_percentage: 0,
                lessons_completed: 0,
                exercises_completed: 0,
                time_spent_minutes: 0
            },
            status: 'not_started',
            rewards: {
                experience_gained: baseRewards.experience,
                wisdom_gained: baseRewards.wisdom,
                honor_gained: baseRewards.honor
            },
            recommended_by: recommended_by || null
        });
        
        // Send message to agent about new training
        if (recommended_by) {
            await base44.entities.AgentMessage.create({
                from_agent_id: recommended_by,
                to_agent_id: agent_id,
                message: `I've prepared a new training module for you: "${aiResponse.title}". This will help you develop your ${skill_focus || training_type} skills. Complete it to gain ${baseRewards.experience} experience and ${baseRewards.wisdom} wisdom.`,
                status: 'sent'
            });
        }
        
        return Response.json({
            success: true,
            training: {
                id: training.id,
                title: aiResponse.title,
                description: aiResponse.description,
                difficulty: difficulty,
                lessons_count: aiResponse.lessons?.length || 0,
                exercises_count: aiResponse.exercises?.length || 0,
                estimated_duration: aiResponse.estimated_duration_minutes,
                potential_rewards: baseRewards
            }
        });
        
    } catch (error) {
        console.error('Training generation error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});
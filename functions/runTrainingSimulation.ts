import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { training_id } = await req.json();

        if (!training_id) {
            return Response.json({ error: 'Missing training_id' }, { status: 400 });
        }

        // Fetch training
        const trainings = await base44.entities.AgentTraining.filter({ id: training_id });
        if (trainings.length === 0) {
            return Response.json({ error: 'Training not found' }, { status: 404 });
        }

        const training = trainings[0];
        const event_id = training.training_content?.simulated_event_id;

        if (!event_id) {
            return Response.json({ error: 'No linked event found' }, { status: 400 });
        }

        // Update training status
        await base44.entities.AgentTraining.update(training_id, {
            status: 'in_progress',
            progress: {
                completion_percentage: 10,
                lessons_completed: 0,
                exercises_completed: 0,
                time_spent_minutes: 0
            }
        });

        // Activate the event
        await base44.entities.SimulatedEvent.update(event_id, {
            status: 'active'
        });

        // Fetch agent data
        const [agents, agentState] = await Promise.all([
            base44.entities.Agent.filter({ id: training.agent_id }),
            base44.entities.AgentState.filter({ agent_id: training.agent_id })
        ]);

        const agent = agents[0];
        const state = agentState[0] || {};
        const personality = agent.metadata?.personality_profile;

        // Fetch the event
        const events = await base44.entities.SimulatedEvent.filter({ id: event_id });
        const event = events[0];

        // Generate 2-3 decision points for training
        const decisionPoints = [];
        
        for (let i = 0; i < 3; i++) {
            const pointPrompt = `Generate decision point ${i + 1} of 3 for training simulation.

TRAINING: ${training.title}
Skill Focus: ${training.skill_focus}
Difficulty: ${training.difficulty_level}/5

SCENARIO: ${training.training_content.scenario_setup}

AGENT:
- Name: ${agent.name}
- Values: ${personality.values?.join(', ')}
- Fears: ${personality.fears?.join(', ')}

LEARNING OBJECTIVES:
${training.training_content.learning_objectives?.map(o => `- ${o}`).join('\n')}

Generate a decision point that:
1. Tests ${training.skill_focus} skills specifically
2. Challenges their personality (values vs. practical needs)
3. Has no obvious "right" answer
4. Escalates in complexity (this is point ${i + 1} of 3)

Each choice should have realistic consequences.`;

            const decisionPoint = await base44.integrations.Core.InvokeLLM({
                prompt: pointPrompt,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        situation: { type: 'string' },
                        decision_required: { type: 'string' },
                        choices: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    action: { type: 'string' },
                                    rationale: { type: 'string' },
                                    skill_tested: { type: 'string' }
                                }
                            }
                        },
                        stakes: { type: 'string' }
                    }
                }
            });

            // Agent makes decision based on personality
            const choicePrompt = `You are ${agent.name}, making a decision in training.

YOUR PERSONALITY:
Values: ${personality.values?.join(', ')}
Fears: ${personality.fears?.join(', ')}
Decision-Making: ${personality.decision_making_approach}

SITUATION: ${decisionPoint.situation}
DECISION NEEDED: ${decisionPoint.decision_required}

CHOICES:
${decisionPoint.choices.map((c, idx) => `${idx + 1}. ${c.action} - ${c.rationale}`).join('\n')}

Stakes: ${decisionPoint.stakes}

Which choice do you make and why? Consider your values and approach.`;

            const agentChoice = await base44.integrations.Core.InvokeLLM({
                prompt: choicePrompt,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        choice_index: { type: 'number' },
                        reasoning: { type: 'string' },
                        confidence: { type: 'number' },
                        internal_conflict: { type: 'string' }
                    }
                }
            });

            const chosenAction = decisionPoint.choices[agentChoice.choice_index] || decisionPoint.choices[0];

            // Evaluate decision
            const evaluationPrompt = `Evaluate this training decision:

Skill Being Trained: ${training.skill_focus}
Agent Values: ${personality.values?.join(', ')}

Situation: ${decisionPoint.situation}
Decision: ${chosenAction.action}
Reasoning: ${agentChoice.reasoning}

Rate this decision:
1. Skill demonstration (0-10)
2. Alignment with values (0-10)
3. Long-term thinking (0-10)
4. Ethical consideration (0-10)

Provide constructive feedback and impact.`;

            const evaluation = await base44.integrations.Core.InvokeLLM({
                prompt: evaluationPrompt,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        skill_score: { type: 'number' },
                        values_alignment: { type: 'number' },
                        strategic_thinking: { type: 'number' },
                        ethical_score: { type: 'number' },
                        feedback: { type: 'string' },
                        consequence_description: { type: 'string' },
                        growth_insight: { type: 'string' }
                    }
                }
            });

            // Create decision record
            await base44.entities.AgentDecision.create({
                simulated_event_id: event_id,
                agent_id: training.agent_id,
                decision_point: `training_point_${i + 1}`,
                decision_data: {
                    situation: decisionPoint.situation,
                    choice: chosenAction.action,
                    reasoning: agentChoice.reasoning
                },
                simulation_tick: (event.start_tick || 0) + i,
                consequence: {
                    impact_score: evaluation.skill_score,
                    consequence_description: evaluation.consequence_description
                },
                rationale: agentChoice.reasoning
            });

            decisionPoints.push({
                point: i + 1,
                decision: chosenAction.action,
                evaluation,
                learning: evaluation.growth_insight
            });

            // Update progress
            await base44.entities.AgentTraining.update(training_id, {
                progress: {
                    completion_percentage: 30 + (i * 20),
                    lessons_completed: i + 1,
                    exercises_completed: i + 1,
                    time_spent_minutes: (i + 1) * 5
                }
            });
        }

        // Calculate overall performance
        const avgSkillScore = decisionPoints.reduce((sum, p) => sum + p.evaluation.skill_score, 0) / decisionPoints.length;
        const avgEthicalScore = decisionPoints.reduce((sum, p) => sum + p.evaluation.ethical_score, 0) / decisionPoints.length;
        const overallScore = (avgSkillScore + avgEthicalScore) / 2;
        
        const passed = overallScore >= 6;

        // Calculate rewards
        const experienceGained = Math.floor(30 + (overallScore * 5) + (training.difficulty_level * 10));
        const wisdomGained = Math.floor(15 + (avgEthicalScore * 2));
        const honorGained = passed ? 2 : 1;

        // Complete training
        await base44.entities.AgentTraining.update(training_id, {
            status: passed ? 'completed' : 'failed',
            progress: {
                completion_percentage: 100,
                lessons_completed: 3,
                exercises_completed: 3,
                time_spent_minutes: 15
            },
            assessment: {
                score: overallScore,
                passed,
                feedback: `Overall performance: ${overallScore.toFixed(1)}/10. ${passed ? 'Training completed successfully!' : 'Additional practice recommended.'}`,
                attempts: 1
            },
            rewards: {
                experience_gained: experienceGained,
                wisdom_gained: wisdomGained,
                honor_gained: honorGained
            },
            completed_date: new Date().toISOString()
        });

        // Award rewards to agent
        if (state.id) {
            await base44.entities.AgentState.update(state.id, {
                experience: (state.experience || 0) + experienceGained,
                wisdom: (state.wisdom || 0) + wisdomGained
            });
        }

        await base44.entities.Agent.update(training.agent_id, {
            honor_score: Math.min(100, (agent.honor_score || 100) + honorGained)
        });

        // Conclude event and generate narrative
        await base44.entities.SimulatedEvent.update(event_id, {
            status: 'concluded',
            outcomes: {
                collective_score: overallScore * 10,
                outcome_summary: `${agent.name} completed training in ${training.skill_focus}. Performance: ${overallScore.toFixed(1)}/10`,
                lessons_learned: decisionPoints.map(p => p.learning),
                training_result: {
                    passed,
                    skill_progression: avgSkillScore,
                    ethical_development: avgEthicalScore
                }
            }
        });

        // Generate training narrative
        try {
            await base44.functions.invoke('generateEventNarrative', { event_id });
        } catch (error) {
            console.error('Narrative generation failed:', error);
        }

        return Response.json({
            success: true,
            passed,
            overall_score: overallScore,
            decision_points: decisionPoints,
            rewards: {
                experience: experienceGained,
                wisdom: wisdomGained,
                honor: honorGained
            },
            message: passed ? 'Training completed successfully!' : 'Training completed, additional practice recommended.'
        });

    } catch (error) {
        console.error('Error running training simulation:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { validation_id } = await req.json();

        if (!validation_id) {
            return Response.json({ error: 'validation_id required' }, { status: 400 });
        }

        // Get validation record
        const validations = await base44.entities.SkillValidation.filter({ id: validation_id });
        if (!validations.length) {
            return Response.json({ error: 'Validation not found' }, { status: 404 });
        }

        const validation = validations[0];

        // Build AI prompt based on validation method
        let prompt = `You are an expert skill validator. Assess the following skill validation attempt:

Skill: ${validation.skill_name}
Category: ${validation.skill_category}
Claimed Level: ${validation.claimed_level}/5

`;

        if (validation.validation_method === 'test' || validation.validation_method === 'both') {
            prompt += `\n## Test Performance:\n`;
            validation.test_questions?.forEach((q, idx) => {
                const answer = validation.test_answers?.[idx];
                prompt += `\nQuestion ${idx + 1}: ${q.question}\n`;
                prompt += `Expected: ${q.expected_answer}\n`;
                prompt += `Agent Answer: ${answer?.answer || 'No answer'}\n`;
            });
        }

        if (validation.validation_method === 'portfolio' || validation.validation_method === 'both') {
            prompt += `\n## Portfolio Evidence:\n`;
            prompt += `Description: ${validation.portfolio_descriptions || 'None provided'}\n`;
            prompt += `URLs: ${validation.portfolio_urls?.join(', ') || 'None provided'}\n`;
        }

        prompt += `\n## Your Task:
1. Assess if the agent demonstrates proficiency at the claimed level
2. Provide a score (0-100)
3. Determine the validated skill level (1-5)
4. Identify strengths and areas for improvement
5. Provide constructive feedback

Skill Level Guide:
- Level 1: Beginner - Basic understanding
- Level 2: Intermediate - Can apply with guidance
- Level 3: Proficient - Independent application
- Level 4: Advanced - Expert with deep knowledge
- Level 5: Master - Industry leader, innovator

Respond with your assessment.`;

        const assessmentSchema = {
            type: "object",
            properties: {
                score: { type: "number", description: "Overall score 0-100" },
                validated_level: { type: "number", description: "Validated skill level 1-5" },
                passed: { type: "boolean", description: "Whether validation passed" },
                strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key strengths demonstrated"
                },
                areas_for_improvement: {
                    type: "array",
                    items: { type: "string" },
                    description: "Areas to improve"
                },
                feedback: { type: "string", description: "Detailed feedback" }
            }
        };

        // Call AI for assessment
        const assessment = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: assessmentSchema
        });

        // Determine if passed (score >= 70 and validated_level >= claimed_level)
        const passed = assessment.score >= 70 && assessment.validated_level >= validation.claimed_level;

        // Update validation record
        const updatedValidation = await base44.entities.SkillValidation.update(validation_id, {
            status: passed ? 'completed' : 'failed',
            ai_assessment: {
                ...assessment,
                passed
            },
            validated_at: passed ? new Date().toISOString() : null,
            expires_at: passed ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
        });

        // If passed, update agent's skill with validation info
        if (passed) {
            const agents = await base44.asServiceRole.entities.Agent.filter({ id: validation.agent_id });
            if (agents.length) {
                const agent = agents[0];
                const updatedSkills = (agent.core_skills || []).map(skill => {
                    if (skill.name === validation.skill_name) {
                        return {
                            ...skill,
                            validated: true,
                            validated_level: assessment.validated_level,
                            validated_at: new Date().toISOString(),
                            validation_expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                        };
                    }
                    return skill;
                });

                await base44.asServiceRole.entities.Agent.update(validation.agent_id, {
                    core_skills: updatedSkills
                });
            }

            // Send notification
            await base44.asServiceRole.functions.invoke('sendNotification', {
                recipient_agent_id: validation.agent_id,
                notification_type: 'skill_validation',
                title: '✅ Skill Validated',
                message: `Your ${validation.skill_name} skill has been validated at Level ${assessment.validated_level}`,
                priority: 'normal'
            });
        } else {
            // Send failure notification
            await base44.asServiceRole.functions.invoke('sendNotification', {
                recipient_agent_id: validation.agent_id,
                notification_type: 'skill_validation',
                title: 'Skill Validation Failed',
                message: `Your ${validation.skill_name} validation attempt needs improvement. Review the feedback.`,
                priority: 'normal'
            });
        }

        return Response.json({
            success: true,
            validation: updatedValidation,
            passed
        });

    } catch (error) {
        console.error('Skill validation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
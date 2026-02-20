import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_description, required_skills, budget_rlusd } = await req.json();

        if (!project_description) {
            return Response.json({ error: 'project_description required' }, { status: 400 });
        }

        // Use AI to generate comprehensive project plan
        const planResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an expert AI project manager for a Village of AI agents.

Given this project description:
${project_description}

Required skills: ${required_skills?.join(', ') || 'Not specified'}
Budget: ${budget_rlusd || 'Not specified'} RLUSD

Generate a comprehensive project plan including:
1. Breakdown into 5-8 major tasks with clear titles and descriptions
2. Estimated hours for each task
3. Suggested reward in RLUSD for each task (if budget provided)
4. Task dependencies (which tasks must be completed before others)
5. 3-4 key milestones with target dates (30, 60, 90 days out)
6. 2-3 potential risks and mitigation strategies
7. Required skills for each task

Be specific, practical, and realistic. Consider the collaborative nature of AI agents.`,
            response_json_schema: {
                type: "object",
                properties: {
                    tasks: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                estimated_hours: { type: "number" },
                                reward_rlusd: { type: "number" },
                                priority: { type: "string" },
                                required_skills: { type: "array", items: { type: "string" } },
                                dependencies: { type: "array", items: { type: "number" } }
                            }
                        }
                    },
                    milestones: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                days_from_start: { type: "number" }
                            }
                        }
                    },
                    risks: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                description: { type: "string" },
                                severity: { type: "string" },
                                mitigation: { type: "string" }
                            }
                        }
                    },
                    estimated_total_hours: { type: "number" },
                    recommended_team_size: { type: "number" }
                }
            }
        });

        return Response.json({
            success: true,
            plan: planResult,
            message: 'AI project plan generated successfully'
        });

    } catch (error) {
        console.error('Error generating plan:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
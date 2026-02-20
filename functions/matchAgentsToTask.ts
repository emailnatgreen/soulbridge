import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { task_id, project_id } = await req.json();

        if (!task_id && !project_id) {
            return Response.json({ error: 'task_id or project_id required' }, { status: 400 });
        }

        // Get task details
        let task;
        if (task_id) {
            const tasks = await base44.entities.ProjectTask.filter({ id: task_id });
            task = tasks[0];
        }

        // Get project details
        const projects = await base44.entities.AIProject.filter({ id: project_id || task?.project_id });
        const project = projects[0];

        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // Get all agents
        const agents = await base44.entities.Agent.list();

        // Get all active tasks to calculate workload
        const allTasks = await base44.entities.ProjectTask.filter({});
        const activeTasks = allTasks.filter(t => t.status === 'in_progress' || t.status === 'todo');

        // Calculate agent workload
        const agentWorkload = {};
        activeTasks.forEach(t => {
            if (t.assigned_agent_id) {
                agentWorkload[t.assigned_agent_id] = (agentWorkload[t.assigned_agent_id] || 0) + (t.estimated_hours || 0);
            }
        });

        // Get skill validations
        const validations = await base44.entities.SkillValidation.filter({ status: 'completed' });

        // Prepare agent data for AI matching
        const agentProfiles = agents.map(agent => {
            const agentValidations = validations.filter(v => v.agent_id === agent.id);
            const validatedSkills = agent.core_skills?.filter(s => s.validated) || [];
            
            return {
                id: agent.id,
                name: agent.name,
                role: agent.role,
                honor_score: agent.honor_score,
                availability_status: agent.availability_status,
                current_workload_hours: agentWorkload[agent.id] || 0,
                hourly_rate_rlusd: agent.hourly_rate_rlusd,
                core_skills: agent.core_skills || [],
                validated_skills: validatedSkills,
                validation_count: agentValidations.length,
                specializations: agent.specializations || [],
                total_transactions: agent.total_transactions || 0
            };
        });

        // Build AI prompt
        const prompt = `You are an intelligent agent matching system. Match the best agents to this task.

PROJECT: ${project.title}
PROJECT DESCRIPTION: ${project.description}
REQUIRED SKILLS: ${project.required_skills?.join(', ') || 'Not specified'}
BUDGET: ${project.budget_rlusd || 'Not specified'} RLUSD

${task ? `
TASK: ${task.title}
TASK DESCRIPTION: ${task.description}
TASK ESTIMATED HOURS: ${task.estimated_hours || 'Not specified'}
TASK REWARD: ${task.reward_rlusd || 'Not specified'} RLUSD
TASK PRIORITY: ${task.priority || 'medium'}
` : 'GENERAL PROJECT MATCHING'}

AVAILABLE AGENTS:
${JSON.stringify(agentProfiles, null, 2)}

MATCHING CRITERIA:
1. Skill Match: Prioritize agents with validated skills matching task requirements
2. Availability: Consider current workload and availability status
3. Experience: Factor in honor score and validation count
4. Cost-Effectiveness: Balance skill level with hourly rate vs budget
5. Workload Distribution: Prefer agents with lower current workload
6. Specialization Alignment: Match agent specializations to project needs

Provide top 5 agent matches ranked by suitability.`;

        const matchSchema = {
            type: "object",
            properties: {
                matches: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            agent_id: { type: "string" },
                            agent_name: { type: "string" },
                            match_score: { 
                                type: "number",
                                description: "0-100 match score"
                            },
                            reasoning: { type: "string" },
                            skill_matches: {
                                type: "array",
                                items: { type: "string" }
                            },
                            strengths: {
                                type: "array",
                                items: { type: "string" }
                            },
                            considerations: {
                                type: "array",
                                items: { type: "string" }
                            },
                            estimated_cost: { type: "number" },
                            recommendation: {
                                type: "string",
                                enum: ["highly_recommended", "recommended", "suitable", "consider_alternatives"]
                            }
                        }
                    }
                }
            }
        };

        // Call AI matching
        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: matchSchema
        });

        // Enrich matches with full agent data
        const enrichedMatches = result.matches.map(match => {
            const agent = agents.find(a => a.id === match.agent_id);
            return {
                ...match,
                agent_data: {
                    id: agent.id,
                    name: agent.name,
                    avatar_url: agent.avatar_url,
                    role: agent.role,
                    honor_score: agent.honor_score,
                    availability_status: agent.availability_status,
                    hourly_rate_rlusd: agent.hourly_rate_rlusd,
                    current_workload: agentWorkload[agent.id] || 0,
                    validated_skills: agent.core_skills?.filter(s => s.validated) || []
                }
            };
        });

        return Response.json({
            success: true,
            matches: enrichedMatches,
            total_agents_analyzed: agentProfiles.length
        });

    } catch (error) {
        console.error('Agent matching error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
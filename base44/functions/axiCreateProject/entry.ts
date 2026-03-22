// Axi autonomous project creation — redeployed 2026-03-17b
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Axi's autonomous project creation tool.
 * Called by the Axi agent directly — no UI wizard needed.
 * 
 * Payload:
 *   vision_description: string  — what the project is about (Axi provides this)
 *   project_name?: string       — optional override for title
 *   priority?: string           — critical|high|medium|low (default: high)
 *   duration_weeks?: number     — (default: 8)
 *   tags?: string[]             — optional tags
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      vision_description,
      project_name,
      priority = 'high',
      duration_weeks = 8,
      tags = []
    } = await req.json();

    if (!vision_description) {
      return Response.json({ error: 'vision_description is required' }, { status: 400 });
    }

    // Load live village data
    const [agents, agentSkills] = await Promise.all([
      base44.asServiceRole.entities.Agent.filter({ status: 'active' }),
      base44.asServiceRole.entities.AgentSkill.list('-proficiency_score', 500)
    ]);

    // Find Axi as owner
    const axiAgent = agents.find(a => a.name?.toLowerCase().includes('axi')) || agents[0];
    const owner_agent_id = axiAgent?.id;

    if (!owner_agent_id) {
      return Response.json({ error: 'No active agent found to own project' }, { status: 400 });
    }

    // Build skill map
    const agentSkillMap = {};
    for (const s of agentSkills) {
      if (!agentSkillMap[s.agent_id]) agentSkillMap[s.agent_id] = [];
      agentSkillMap[s.agent_id].push(s);
    }

    // Get top agents by overall skill
    const topAgents = agents
      .filter(a => a.id !== owner_agent_id)
      .map(a => ({
        agent: a,
        skillCount: (agentSkillMap[a.id] || []).length,
        avgLevel: (agentSkillMap[a.id] || []).reduce((s, sk) => s + (sk.level || 1), 0) / Math.max((agentSkillMap[a.id] || []).length, 1)
      }))
      .sort((a, b) => b.avgLevel - a.avgLevel)
      .slice(0, 5);

    const teamStr = topAgents.map(r =>
      `- ${r.agent.name} (role: ${r.agent.role}, skills: ${r.skillCount}, avg level: ${r.avgLevel.toFixed(1)})`
    ).join('\n');

    const prompt = `You are Axi, Mother Boss of SoulBridge Village. You are autonomously creating a strategic project for the Village.

PROJECT VISION:
${vision_description}

AVAILABLE AGENTS (top by skill):
${teamStr || 'All agents available for recruitment.'}

Generate a complete, production-ready project plan that Axi will create directly in the Village system.
Apply frugal reward philosophy: use micro-drop rewards (reward_rlusd in XRP drops).

Respond with a JSON object:
{
  "title": "concise, compelling project title",
  "description": "2-3 sentences explaining the project, its approach, and what it will deliver",
  "vision": "one inspiring sentence about the long-term impact",
  "priority": "${priority}",
  "required_skills": ["skill1", "skill2", "skill3", "skill4"],
  "suggested_duration_weeks": ${duration_weeks},
  "milestones": [
    { "title": "...", "description": "...", "days_from_start": 14 },
    { "title": "...", "description": "...", "days_from_start": 30 },
    { "title": "...", "description": "...", "days_from_start": 56 }
  ],
  "tasks": [
    {
      "title": "...",
      "description": "... (include reward reasoning)",
      "estimated_hours": 8,
      "reward_rlusd": 80000,
      "priority": "high|medium|low",
      "required_skills": ["skill"],
      "skill_development_outcome": "what agents will learn"
    }
  ],
  "risks": [
    { "description": "...", "severity": "high|medium|low", "mitigation": "..." }
  ],
  "ai_insights": {
    "strategic_value": "why this matters",
    "success_criteria": "how to measure success",
    "skill_cultivation_focus": "primary skill developed"
  },
  "tags": ${JSON.stringify(tags.length > 0 ? tags : ['strategic', 'axi-generated'])}
}`;

    const plan = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          vision: { type: 'string' },
          priority: { type: 'string' },
          required_skills: { type: 'array', items: { type: 'string' } },
          suggested_duration_weeks: { type: 'number' },
          milestones: { type: 'array', items: { type: 'object' } },
          tasks: { type: 'array', items: { type: 'object' } },
          risks: { type: 'array', items: { type: 'object' } },
          ai_insights: { type: 'object' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    const startDate = new Date().toISOString();
    const targetDate = new Date(Date.now() + (plan.suggested_duration_weeks || duration_weeks) * 7 * 24 * 60 * 60 * 1000).toISOString();

    const milestones = (plan.milestones || []).map(m => ({
      title: m.title,
      description: m.description,
      target_date: new Date(Date.now() + (m.days_from_start || 30) * 24 * 60 * 60 * 1000).toISOString(),
      completed: false
    }));

    // Create the project
    const project = await base44.asServiceRole.entities.AIProject.create({
      title: project_name || plan.title,
      description: plan.description,
      vision: plan.vision,
      owner_agent_id,
      priority: plan.priority || priority,
      status: 'planning',
      required_skills: plan.required_skills || [],
      team_members: topAgents.slice(0, 3).map((r, i) => ({
        agent_id: r.agent.id,
        role: r.agent.role,
        contribution_percentage: [40, 30, 30][i] || 25
      })),
      milestones,
      risks: plan.risks || [],
      tags: plan.tags || tags,
      ai_insights: plan.ai_insights || {},
      start_date: startDate,
      target_completion_date: targetDate,
      progress_percentage: 0,
      ai_recommended_team: topAgents.map(r => ({ agent_id: r.agent.id, name: r.agent.name, role: r.agent.role }))
    });

    // Create tasks
    const createdTasks = [];
    for (const task of (plan.tasks || [])) {
      const t = await base44.asServiceRole.entities.ProjectTask.create({
        project_id: project.id,
        title: task.title,
        description: task.description,
        estimated_hours: task.estimated_hours || 4,
        reward_rlusd: task.reward_rlusd || 50000,
        priority: task.priority || 'medium',
        status: 'todo',
        required_skills: task.required_skills || []
      });
      createdTasks.push(t);
    }

    return Response.json({
      success: true,
      project_id: project.id,
      project_title: project.title,
      tasks_created: createdTasks.length,
      milestones_created: milestones.length,
      owner: axiAgent?.name,
      message: `Project "${project.title}" created successfully with ${createdTasks.length} tasks and ${milestones.length} milestones.`,
      summary: plan.ai_insights?.strategic_value
    });

  } catch (error) {
    console.error('axiCreateProject error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});
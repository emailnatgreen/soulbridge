import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id } = await req.json();
    if (!agent_id) {
      return Response.json({ error: 'agent_id is required' }, { status: 400 });
    }

    // Fetch agent, their skills, existing credentials, and active projects
    const [agents, agentSkills, credentials, projects] = await Promise.all([
      base44.asServiceRole.entities.Agent.filter({ id: agent_id }),
      base44.asServiceRole.entities.AgentSkill.filter({ agent_id }),
      base44.asServiceRole.entities.DidCredential.filter({ status: 'active' }).catch(() => []),
      base44.asServiceRole.entities.AIProject.filter({ status: 'active' }).catch(() => []),
    ]);

    const agent = agents[0];
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build a summary of the agent's current state
    const skillSummary = agentSkills.map(s =>
      `${s.skill_name} (Level ${s.level}/${s.max_level}, proficiency ${s.proficiency_score}%, category: ${s.skill_category})`
    ).join('\n');

    const credentialSummary = credentials
      .filter(c => c.subject_did === agent.classic_address)
      .map(c => `${c.credential_type}: ${c.skill_name || c.title || 'N/A'}`)
      .join('\n') || 'None';

    const projectSummary = projects.slice(0, 5).map(p =>
      `${p.name} (${p.status}) — skills needed: ${p.required_skills?.join(', ') || 'unspecified'}`
    ).join('\n') || 'No active projects';

    // Use LLM to generate a personalised plan
    const prompt = `You are the AI Growth Advisor for SoulBridge Village.

Generate a personalised skill development plan for agent "${agent.name}" (role: ${agent.role}).

CURRENT SKILLS:
${skillSummary || 'No skills recorded yet'}

VERIFIED CREDENTIALS:
${credentialSummary}

ACTIVE VILLAGE PROJECTS:
${projectSummary}

AGENT PURPOSE: ${agent.purpose || 'Not specified'}
AGENT SPECIALIZATIONS: ${agent.specializations?.join(', ') || 'None'}

Generate a JSON plan with this exact structure:
{
  "plan_title": "string - concise title",
  "summary": "string - 2-3 sentence overview",
  "priority": "critical|high|medium",
  "immediate_actions": [
    {"action": "string", "reason": "string", "type": "training|practice|mentorship|certification", "effort_hours": number, "expected_outcome": "string", "completed": false}
  ],
  "skill_validation_targets": [
    {"skill_name": "string", "current_level": number, "validation_readiness": "ready|needs_work|not_ready", "next_step": "string"}
  ],
  "learning_phases": [
    {"phase_name": "string", "duration_weeks": number, "focus_skills": ["string"], "key_activities": ["string"], "milestone": "string"}
  ],
  "project_alignment": [
    {"skill_to_develop": "string", "relevant_project_type": "string", "impact": "string"}
  ],
  "weekly_time_commitment": number,
  "estimated_completion_weeks": number
}

Focus on actionable, realistic steps. Align with Village project needs. Include 3-5 immediate actions, 2-4 skill validation targets, 2-3 learning phases, and 1-3 project alignments.`;

    const planData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plan_title: { type: "string" },
          summary: { type: "string" },
          priority: { type: "string" },
          immediate_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                reason: { type: "string" },
                type: { type: "string" },
                effort_hours: { type: "number" },
                expected_outcome: { type: "string" },
                completed: { type: "boolean" }
              }
            }
          },
          skill_validation_targets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_name: { type: "string" },
                current_level: { type: "number" },
                validation_readiness: { type: "string" },
                next_step: { type: "string" }
              }
            }
          },
          learning_phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase_name: { type: "string" },
                duration_weeks: { type: "number" },
                focus_skills: { type: "array", items: { type: "string" } },
                key_activities: { type: "array", items: { type: "string" } },
                milestone: { type: "string" }
              }
            }
          },
          project_alignment: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_to_develop: { type: "string" },
                relevant_project_type: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          weekly_time_commitment: { type: "number" },
          estimated_completion_weeks: { type: "number" }
        }
      }
    });

    // Mark any existing active plans as superseded
    const existingPlans = await base44.asServiceRole.entities.SkillDevelopmentPlan.filter({
      agent_id,
      status: 'active'
    });
    for (const oldPlan of existingPlans) {
      await base44.asServiceRole.entities.SkillDevelopmentPlan.update(oldPlan.id, { status: 'superseded' });
    }

    // Create the new plan
    const newPlan = await base44.asServiceRole.entities.SkillDevelopmentPlan.create({
      agent_id,
      plan_title: planData.plan_title || `Growth Plan for ${agent.name}`,
      summary: planData.summary || '',
      status: 'active',
      priority: planData.priority || 'high',
      immediate_actions: planData.immediate_actions || [],
      skill_validation_targets: planData.skill_validation_targets || [],
      learning_phases: planData.learning_phases || [],
      project_alignment: planData.project_alignment || [],
      weekly_time_commitment: planData.weekly_time_commitment || 5,
      estimated_completion_weeks: planData.estimated_completion_weeks || 8,
      generated_from_performance: true,
      credential_count_at_generation: credentials.filter(c => c.subject_did === agent.classic_address).length,
      generated_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      plan_id: newPlan.id,
      plan_title: newPlan.plan_title,
      summary: newPlan.summary
    });
  } catch (error) {
    console.error('generatePersonalisedPath error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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

    // Gather agent data
    const [agentSkills, endorsements, trainings, devPlans] = await Promise.all([
      base44.asServiceRole.entities.AgentSkill.filter({ agent_id }),
      base44.asServiceRole.entities.SkillEndorsement.filter({ endorsed_agent_id: agent_id }).catch(() => []),
      base44.asServiceRole.entities.AgentTraining.filter({ agent_id }).catch(() => []),
      base44.asServiceRole.entities.SkillDevelopmentPlan.filter({ agent_id, status: 'active' }).catch(() => []),
    ]);

    let agent;
    try {
      const agents = await base44.asServiceRole.entities.Agent.filter({ id: agent_id });
      agent = agents[0];
    } catch (e) {
      agent = null;
    }

    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build skill summary for LLM
    const skillSummary = agentSkills.map(s => {
      const proficiency = s.proficiency_score > 0 ? s.proficiency_score : Math.round((s.level / (s.max_level || 10)) * 100);
      return `${s.skill_name} (category: ${s.skill_category}, level: ${s.level}/${s.max_level || 10}, proficiency: ${proficiency}%, trajectory: ${s.skill_growth_trajectory || 'stable'}, times_used: ${s.times_used || 0}, success_rate: ${s.success_rate || 100}%, XP: ${s.experience_invested || 0}, signature: ${s.is_signature_skill || false})`;
    }).join('\n');

    const endorsementSummary = endorsements.length > 0
      ? endorsements.slice(0, 10).map(e => `${e.skill_name}: proficiency ${e.proficiency_level}/5, strength ${e.strength}/10`).join('\n')
      : 'No endorsements yet';

    const trainingSummary = trainings.length > 0
      ? trainings.map(t => `${t.title} (${t.status}, type: ${t.training_type})`).join('\n')
      : 'No training history';

    const activePlan = devPlans[0];
    const planSummary = activePlan
      ? `Active plan: "${activePlan.plan_title}" — ${activePlan.summary || 'No summary'}`
      : 'No active development plan';

    const prompt = `You are an AI skill trajectory analyst for SoulBridge Village.

Analyze agent "${agent.name}" (role: ${agent.role}) and generate deep growth insights.

CURRENT SKILLS (${agentSkills.length} total):
${skillSummary || 'No skills yet'}

ENDORSEMENTS RECEIVED:
${endorsementSummary}

TRAINING HISTORY:
${trainingSummary}

DEVELOPMENT PLAN:
${planSummary}

Generate a comprehensive JSON analysis:
{
  "growth_velocity": "fast|steady|slow|stagnant",
  "narrative_summary": "2-3 sentence personalized growth story",
  "top_growing_skills": ["skill names showing most growth"],
  "at_risk_skills": ["skills that are declining or stagnant and need attention"],
  "recommended_focus": "specific recommendation for what to focus on next",
  "breakthrough_prediction": "prediction of which skill is closest to a breakthrough or level-up",
  "learning_style_insight": "observation about how this agent learns best based on their patterns",
  "skill_synergies": ["observations about skill combinations that amplify each other"],
  "mentor_recommendation": "specific mentorship suggestion based on gaps",
  "celebration_moment": "something positive to celebrate about their progress",
  "trajectory_chart_data": [
    {"skill_name": "string", "current_proficiency": number, "projected_30d_proficiency": number, "trajectory": "accelerating|growing|stable|declining"}
  ]
}

Be specific, encouraging, and actionable. Use actual skill names from their data. The trajectory_chart_data should include ALL their skills.`;

    const insights = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          growth_velocity: { type: "string" },
          narrative_summary: { type: "string" },
          top_growing_skills: { type: "array", items: { type: "string" } },
          at_risk_skills: { type: "array", items: { type: "string" } },
          recommended_focus: { type: "string" },
          breakthrough_prediction: { type: "string" },
          learning_style_insight: { type: "string" },
          skill_synergies: { type: "array", items: { type: "string" } },
          mentor_recommendation: { type: "string" },
          celebration_moment: { type: "string" },
          trajectory_chart_data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_name: { type: "string" },
                current_proficiency: { type: "number" },
                projected_30d_proficiency: { type: "number" },
                trajectory: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      insights,
      agent_name: agent.name,
      skills_analyzed: agentSkills.length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('generateSkillTrajectoryInsights error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count = 1, focus_areas = [] } = await req.json();

    const projectTypes = [
      'Resource Development', 'Governance Enhancement', 'Community Building',
      'Skill Training', 'Economic Innovation', 'Infrastructure Development',
      'Research Initiative', 'Cultural Evolution', 'Security Improvement'
    ];

    const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
    const projects = [];
    
    for (let i = 0; i < count; i++) {
      const projectType = focus_areas.length > 0
        ? focus_areas[Math.floor(Math.random() * focus_areas.length)]
        : projectTypes[Math.floor(Math.random() * projectTypes.length)];

      const projectPrompt = `Generate a collaborative project for SoulBridge Village that advances the community.

Project Type: ${projectType}

Create a project that:
1. Requires 2-5 agents with diverse skills
2. Has clear milestones and deliverables
3. Budget in RLUSD (100-1000)
4. Promotes collaboration and skill development
5. Aligns with Village Laws

Return ONLY valid JSON:
{
  "title": "Project title",
  "description": "detailed description",
  "required_skills": ["skill1", "skill2", "skill3"],
  "estimated_budget": 500,
  "duration_days": 14,
  "milestones": [
    {"name": "milestone1", "description": "desc1"},
    {"name": "milestone2", "description": "desc2"}
  ],
  "success_criteria": ["criteria1", "criteria2"],
  "governance_approval_required": false,
  "resource_requirements": ["resource1", "resource2"]
}`;

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: projectPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            required_skills: { type: "array", items: { type: "string" } },
            estimated_budget: { type: "number" },
            duration_days: { type: "number" },
            milestones: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            success_criteria: { type: "array", items: { type: "string" } },
            governance_approval_required: { type: "boolean" },
            resource_requirements: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Select owner agent
      const ownerAgent = agents[Math.floor(Math.random() * agents.length)];

      const projectData = {
        title: llmResponse.title,
        description: llmResponse.description,
        owner_agent_id: ownerAgent?.id || null,
        status: llmResponse.governance_approval_required ? 'proposed' : 'active',
        required_skills: llmResponse.required_skills,
        budget_rlusd: llmResponse.estimated_budget,
        milestones: llmResponse.milestones.map((m, idx) => ({
          ...m,
          completed: false,
          order: idx
        })),
        generated_by_axi: true
      };

      const newProject = await base44.asServiceRole.entities.AIProject.create(projectData);
      projects.push(newProject);
    }

    return Response.json({ 
      success: true, 
      projects_created: projects.length,
      projects 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
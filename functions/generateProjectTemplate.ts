import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      project_type, 
      category, 
      difficulty_level,
      team_size,
      duration_days,
      budget_range
    } = await req.json();

    // Generate comprehensive template using AI
    const prompt = `Generate a comprehensive project template for the following:

Project Type: ${project_type}
Category: ${category}
Difficulty: ${difficulty_level}
Team Size: ${team_size || 'not specified'}
Duration: ${duration_days || 'not specified'} days
Budget Range: ${budget_range || 'not specified'} RLUSD

Create a detailed project template that includes:
1. Clear, actionable milestone templates with specific deliverables
2. Comprehensive task breakdown with estimated hours
3. Required skills for each task
4. Budget allocation guidance
5. Success metrics and KPIs
6. Best practices specific to this project type
7. Common pitfalls to avoid
8. Recommended tools or approaches

Format the response to be practical and immediately actionable.`;

    const templateData = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          estimated_duration_days: { type: "number" },
          recommended_team_size: { type: "number" },
          required_skills: {
            type: "array",
            items: { type: "string" }
          },
          milestone_templates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                days_from_start: { type: "number" },
                deliverables: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          task_templates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                estimated_hours: { type: "number" },
                required_skills: {
                  type: "array",
                  items: { type: "string" }
                },
                priority: { type: "string" },
                phase: { type: "string" }
              }
            }
          },
          budget_guidance: {
            type: "object",
            properties: {
              min_budget_rlusd: { type: "number" },
              recommended_budget_rlusd: { type: "number" },
              max_budget_rlusd: { type: "number" },
              breakdown: { type: "object" }
            }
          },
          success_metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                metric: { type: "string" },
                target: { type: "string" },
                importance: { type: "string" }
              }
            }
          },
          best_practices: {
            type: "array",
            items: { type: "string" }
          },
          common_pitfalls: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      template: {
        ...templateData,
        category,
        difficulty_level,
        is_ai_generated: true,
        tags: [category, difficulty_level, project_type]
      }
    });

  } catch (error) {
    console.error('Generate template error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
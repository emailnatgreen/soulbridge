import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { synthesis_type, knowledge_filter } = await req.json();

    // Fetch relevant knowledge contributions
    const allKnowledge = await base44.asServiceRole.entities.KnowledgeContribution.list('-created_date', 100);
    
    // Filter knowledge based on criteria
    let relevantKnowledge = allKnowledge;
    if (knowledge_filter?.skill_areas) {
      relevantKnowledge = allKnowledge.filter(k => 
        k.skill_areas?.some(skill => knowledge_filter.skill_areas.includes(skill))
      );
    }
    if (knowledge_filter?.category) {
      relevantKnowledge = relevantKnowledge.filter(k => k.category === knowledge_filter.category);
    }

    // Prepare knowledge context for AI
    const knowledgeContext = relevantKnowledge.map(k => ({
      id: k.id,
      title: k.title,
      category: k.category,
      content: k.content,
      tags: k.tags,
      skill_areas: k.skill_areas
    }));

    // Generate synthesis based on type
    const synthesisPrompt = `Analyze the following knowledge contributions and create a comprehensive ${synthesis_type.replace('_', ' ')}:

Knowledge Base:
${JSON.stringify(knowledgeContext, null, 2)}

Generate a synthesis that includes:
1. A comprehensive overview of the knowledge domain
2. Key insights extracted from the collective wisdom (with confidence scores 0-10)
3. Actionable recommendations with priority levels and expected impact
4. Cross-domain connections and relationships between topics
5. Emerging patterns and trends
6. Skill areas this synthesis covers

Be specific, practical, and actionable. Focus on extracting wisdom that can drive growth and innovation.`;

    const synthesis = await base44.integrations.Core.InvokeLLM({
      prompt: synthesisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          synthesis_content: { type: "string" },
          key_insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                insight: { type: "string" },
                confidence: { type: "number" },
                supporting_evidence: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          actionable_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                priority: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          knowledge_connections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from_topic: { type: "string" },
                to_topic: { type: "string" },
                relationship: { type: "string" }
              }
            }
          },
          emerging_patterns: {
            type: "array",
            items: { type: "string" }
          },
          skill_areas_covered: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Calculate relevance score based on insights and recommendations
    const relevanceScore = Math.min(10, 
      (synthesis.key_insights?.length || 0) * 0.5 + 
      (synthesis.actionable_recommendations?.length || 0) * 0.3 + 
      (synthesis.knowledge_connections?.length || 0) * 0.2
    );

    return Response.json({
      synthesis: {
        ...synthesis,
        synthesis_type,
        source_knowledge_ids: relevantKnowledge.map(k => k.id),
        relevance_score: relevanceScore,
        generated_at: new Date().toISOString(),
        auto_generated: true
      }
    });

  } catch (error) {
    console.error('Synthesis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
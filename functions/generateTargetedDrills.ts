import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DIMS = ['empathy', 'clarity', 'problem_solving', 'de_escalation', 'brand_voice', 'context_integration'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id } = await req.json();
    if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

    // Fetch latest published mentor report
    const reports = await base44.entities.MentorReport.filter({ agent_id, status: 'published' }, '-created_date', 1);
    if (!reports.length) return Response.json({ error: 'No published mentor report found. Generate a mentor report first.' }, { status: 404 });

    const report = reports[0];
    const dimAnalysis = report.dimensional_analysis || {};
    const devPlan = report.development_plan || [];

    // Identify weak dimensions (score < 65) sorted by score ascending
    const weakDims = DIMS
      .map(d => ({ dim: d, score: dimAnalysis[d]?.score ?? null }))
      .filter(d => d.score !== null && d.score < 65)
      .sort((a, b) => a.score - b.score);

    // Top focus areas from development plan
    const focusAreas = devPlan.slice(0, 3).map(p => p.focus_area).join(', ') || 'general diplomacy';
    const drillTypes = devPlan.slice(0, 3).map(p => p.suggested_drill_type).join(', ') || 'Medium difficulty reviews';

    // Determine difficulty: if lowest weak dim < 40 → Hard, else Medium
    const lowestScore = weakDims[0]?.score ?? 60;
    const baseDifficulty = lowestScore < 40 ? 'Hard' : lowestScore < 55 ? 'Hard' : 'Medium';

    // Build targeted prompt
    const weakSummary = weakDims.length
      ? weakDims.map(d => `- ${d.dim}: ${d.score}/100`).join('\n')
      : 'No specific weak dimensions — generate well-rounded drills.';

    const prompt = `You are Axi — Maya's AI mentor at SoulBridge Village. Based on Maya's mentor report, generate 5 highly targeted diplomacy training drills (ghost reviews) that specifically challenge her weakest areas.

MAYA'S WEAK DIMENSIONS:
${weakSummary}

DEVELOPMENT PLAN FOCUS AREAS: ${focusAreas}
SUGGESTED DRILL TYPES: ${drillTypes}
OVERALL BASE DIFFICULTY: ${baseDifficulty}

INSTRUCTIONS:
- Each drill must directly exercise one of Maya's weak dimensions. Explicitly design the scenario to force that skill.
- Vary the scenarios: different products/services, different customer archetypes, different complaint types
- Make them realistic SoulBridge Village scenarios (AI agent services, digital products, consulting, village economy)
- Assign a target_dimension field to each review (the primary weakness it trains)
- If de_escalation is weak, at least 1 drill should be an already-heated customer who is on the verge of escalating (tag it "escalation_risk": true)
- Difficulty can vary drill-by-drill between Medium, Hard, and Fire Drill based on which dimension it targets

Return JSON:
{
  "drills": [
    {
      "title": "string",
      "content": "3-5 sentence 1-star review",
      "simulated_customer_name": "string",
      "product_service": "string",
      "service_date": "YYYY-MM-DD (within last 30 days)",
      "sentiment_score": number (-1.0 to -0.5),
      "difficulty_level": "Medium|Hard|Fire Drill",
      "target_dimension": "empathy|clarity|problem_solving|de_escalation|brand_voice|context_integration",
      "escalation_risk": boolean,
      "tags": ["array", "of", "tags"],
      "context_pack": {
        "kb_articles": [{"title": "string", "content": "2-4 sentence policy or procedure"}],
        "customer_history": "2-3 sentence customer background",
        "product_notes": "2-4 sentence product/policy notes relevant to this complaint"
      }
    }
  ]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          drills: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                simulated_customer_name: { type: 'string' },
                product_service: { type: 'string' },
                service_date: { type: 'string' },
                sentiment_score: { type: 'number' },
                difficulty_level: { type: 'string' },
                target_dimension: { type: 'string' },
                escalation_risk: { type: 'boolean' },
                tags: { type: 'array', items: { type: 'string' } },
                context_pack: {
                  type: 'object',
                  properties: {
                    kb_articles: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } } } },
                    customer_history: { type: 'string' },
                    product_notes: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    });

    const drills = result.drills || [];
    const createdReviews = [];

    for (const drill of drills) {
      const review = await base44.entities.GhostReview.create({
        title: drill.title,
        content: drill.content,
        simulated_customer_name: drill.simulated_customer_name,
        product_service: drill.product_service,
        service_date: drill.service_date,
        sentiment_score: drill.sentiment_score,
        difficulty_level: drill.difficulty_level || baseDifficulty,
        assigned_agent_id: agent_id,
        status: 'Pending Response',
        tags: [...(drill.tags || []), drill.target_dimension, 'targeted'].filter(Boolean),
        context_pack: drill.context_pack,
        attempt_count: 0,
        response_history: [],
      });
      createdReviews.push({ ...review, escalation_risk: drill.escalation_risk, target_dimension: drill.target_dimension });
    }

    // Auto-create EscalationChain if de_escalation is weak (score < 65)
    const deEscScore = dimAnalysis['de_escalation']?.score ?? null;
    let escalationChain = null;

    if (deEscScore !== null && deEscScore < 65) {
      // Find the escalation_risk drill to use as root
      const rootDrill = createdReviews.find(r => r.escalation_risk) || createdReviews[0];
      if (rootDrill) {
        escalationChain = await base44.entities.EscalationChain.create({
          title: `Targeted De-escalation Chain — ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
          assigned_agent_id: agent_id,
          root_review_id: rootDrill.id,
          review_ids: [rootDrill.id],
          stage_count: 1,
          current_stage: 1,
          status: 'Active',
          difficulty_level: 'Hard',
          tags: ['targeted', 'de_escalation', 'mentor_generated'],
        });
      }
    }

    return Response.json({
      success: true,
      drills_created: createdReviews.length,
      weak_dimensions: weakDims,
      escalation_chain_created: !!escalationChain,
      escalation_chain_id: escalationChain?.id || null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
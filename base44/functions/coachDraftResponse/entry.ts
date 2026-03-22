import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DIM_LABEL = {
  empathy: 'Empathy',
  clarity: 'Clarity',
  problem_solving: 'Problem Solving',
  de_escalation: 'De-escalation',
  brand_voice: 'Brand Voice',
  context_integration: 'Context Integration',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ghost_review_id, draft_text, weak_dimensions } = await req.json();

    if (!ghost_review_id || !draft_text?.trim()) {
      return Response.json({ error: 'ghost_review_id and draft_text are required' }, { status: 400 });
    }

    if (draft_text.trim().length < 30) {
      return Response.json({ tips: [], reason: 'draft_too_short' });
    }

    const review = await base44.asServiceRole.entities.GhostReview.get(ghost_review_id);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });

    // Build weak dimension context
    const weakContext = weak_dimensions?.length
      ? `Maya's current weakest skill dimensions (prioritise coaching on these):
${weak_dimensions.map(d => `- ${DIM_LABEL[d] || d}`).join('\n')}`
      : '';

    // Context pack summary
    const contextSummary = review.context_pack
      ? [
          review.context_pack.customer_history ? `Customer history: ${review.context_pack.customer_history}` : '',
          review.context_pack.product_notes ? `Product notes: ${review.context_pack.product_notes}` : '',
          (review.context_pack.kb_articles || []).map(a => `KB: ${a.title}`).join(', '),
        ].filter(Boolean).join('\n')
      : '';

    const prompt = `You are an expert diplomatic communication coach helping an AI agent called Maya craft high-quality customer service responses.

ORIGINAL 1-STAR REVIEW:
Customer: ${review.simulated_customer_name}
Title: "${review.title}"
Content: "${review.content}"
Difficulty: ${review.difficulty_level}
${contextSummary ? `\nInternal context available:\n${contextSummary}` : ''}

MAYA'S CURRENT DRAFT:
"${draft_text}"

${weakContext}

Evaluate the draft across these 6 dimensions and provide 3-5 concise, specific, actionable coaching tips:
1. Empathy - Does it acknowledge the customer's specific frustration?
2. Clarity - Is the response clear and easy to follow?
3. Problem Solving - Does it offer a concrete resolution path?
4. De-escalation - Does it calm the situation rather than inflame it?
5. Brand Voice - Is it professional yet warm?
6. Context Integration - Does it use available internal information?

Return a JSON object with:
{
  "tips": [
    {
      "dimension": "empathy|clarity|problem_solving|de_escalation|brand_voice|context_integration",
      "level": "strength|caution|suggestion",
      "text": "Specific, actionable tip about this draft (1-2 sentences max)"
    }
  ],
  "overall_vibe": "one sentence summary of the draft's current strongest quality or biggest opportunity"
}

Rules:
- Be specific to THIS draft, not generic advice
- 'strength' = something done well (positive reinforcement)
- 'caution' = something that could backfire or is missing
- 'suggestion' = a concrete improvement idea
- Max 5 tips, min 3
- If weak_dimensions provided, ensure at least one tip covers each of them`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          tips: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dimension: { type: 'string' },
                level: { type: 'string' },
                text: { type: 'string' },
              },
            },
          },
          overall_vibe: { type: 'string' },
        },
      },
    });

    return Response.json({ success: true, tips: result.tips || [], overall_vibe: result.overall_vibe || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
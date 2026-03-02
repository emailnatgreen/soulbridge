import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ghost_review_id, chain_id } = await req.json();
    if (!ghost_review_id) return Response.json({ error: 'ghost_review_id required' }, { status: 400 });

    const review = await base44.entities.GhostReview.get(ghost_review_id);
    if (!review) return Response.json({ error: 'Ghost review not found' }, { status: 404 });

    // Build existing chain context or create new chain
    let chain = null;
    if (chain_id) {
      chain = await base44.entities.EscalationChain.get(chain_id);
    }

    const stageNumber = chain ? chain.stage_count + 1 : 2;
    const difficultyProgression = {
      Easy: 'Medium',
      Medium: 'Hard',
      Hard: 'Fire Drill',
      'Fire Drill': 'Fire Drill',
    };
    const nextDifficulty = difficultyProgression[review.difficulty_level] || 'Hard';

    const traineeResponse = review.trainee_response || '(no response given)';
    const lastVerdict = review.ai_verdict || 'Acceptable';
    const lastScore = review.ai_score || 60;

    const prompt = `You are a customer experience simulation engine for SoulBridge Village diplomacy training.

The following interaction just occurred (Stage ${stageNumber - 1} of an escalation):

---
ORIGINAL COMPLAINT:
Customer: ${review.simulated_customer_name}
Product/Service: ${review.product_service || 'SoulBridge Service'}
Review: "${review.content}"

AGENT'S RESPONSE:
"${traineeResponse}"

EVALUATION: ${lastVerdict} (Score: ${lastScore}/100)
---

The agent's response was NOT "Refined Vintage" — it was ${lastVerdict}. As a result, the customer is escalating. Generate the NEXT stage of this complaint as a new, more intense 1-star review.

Rules:
- The customer is angrier, more specific, and references the previous agent response explicitly (e.g. "I was told X but..." or "The response I received completely ignored...")
- If Stage ${stageNumber} >= 3, the customer may now be threatening to go public, contact regulators, or demand a supervisor
- The complaint should remain realistic and plausible
- Also generate a NEW context_pack relevant to this escalated complaint (updated KB articles, updated customer history referencing this escalation, updated product notes if relevant)

Return JSON with these exact keys:
{
  "title": "<escalated complaint headline>",
  "content": "<3-6 sentence escalated 1-star review text>",
  "simulated_customer_name": "${review.simulated_customer_name}",
  "product_service": "${review.product_service || 'SoulBridge Service'}",
  "service_date": "<today's date YYYY-MM-DD>",
  "sentiment_score": <-1.0 to -0.7, more extreme than before>,
  "tags": ["escalation", "<topic tag>"],
  "escalation_note": "<1 sentence explaining what triggered this escalation>",
  "context_pack": {
    "kb_articles": [
      {"title": "<article title>", "content": "<2-4 sentence relevant policy or procedure>"},
      {"title": "<article title>", "content": "<2-4 sentence relevant policy or procedure>"}
    ],
    "customer_history": "<updated history including this escalation attempt>",
    "product_notes": "<relevant updated product/policy details>"
  }
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          simulated_customer_name: { type: 'string' },
          product_service: { type: 'string' },
          service_date: { type: 'string' },
          sentiment_score: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          escalation_note: { type: 'string' },
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
    });

    // Create the new escalated GhostReview
    const newReview = await base44.entities.GhostReview.create({
      title: result.title,
      content: result.content,
      simulated_customer_name: result.simulated_customer_name,
      product_service: result.product_service,
      service_date: result.service_date,
      sentiment_score: result.sentiment_score,
      difficulty_level: nextDifficulty,
      assigned_agent_id: review.assigned_agent_id,
      status: 'Pending Response',
      tags: result.tags || ['escalation'],
      context_pack: result.context_pack,
      attempt_count: 0,
      response_history: [],
    });

    // Create or update the escalation chain
    let updatedChain;
    if (chain) {
      const updatedReviewIds = [...(chain.review_ids || []), newReview.id];
      updatedChain = await base44.entities.EscalationChain.update(chain_id, {
        review_ids: updatedReviewIds,
        stage_count: stageNumber,
        current_stage: stageNumber,
        status: 'Active',
      });
    } else {
      updatedChain = await base44.entities.EscalationChain.create({
        title: `${review.title} — Escalation`,
        assigned_agent_id: review.assigned_agent_id,
        root_review_id: ghost_review_id,
        review_ids: [ghost_review_id, newReview.id],
        stage_count: stageNumber,
        current_stage: stageNumber,
        status: 'Active',
        difficulty_level: nextDifficulty,
        tags: result.tags || ['escalation'],
      });
    }

    return Response.json({
      success: true,
      new_review_id: newReview.id,
      chain_id: updatedChain.id,
      stage_number: stageNumber,
      escalation_note: result.escalation_note,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
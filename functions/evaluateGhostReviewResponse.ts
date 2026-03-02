import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ghost_review_id, trainee_response } = await req.json();
    if (!ghost_review_id || !trainee_response?.trim()) {
      return Response.json({ error: 'ghost_review_id and trainee_response are required' }, { status: 400 });
    }

    const review = await base44.entities.GhostReview.get(ghost_review_id);
    if (!review) return Response.json({ error: 'Ghost review not found' }, { status: 404 });

    if (review.status === 'Evaluated') {
      return Response.json({ error: 'This review has already been completed with a Refined Vintage verdict.' }, { status: 400 });
    }

    const attemptNumber = (review.attempt_count || 0) + 1;
    const history = review.response_history || [];

    // Build context pack section for the prompt
    let contextSection = '';
    const cp = review.context_pack;
    if (cp) {
      contextSection = `\n\n---\n## INTERNAL RESOURCES PROVIDED TO TRAINEE\nThe trainee had access to the following internal resources before responding. Evaluate whether they integrated this information appropriately.\n`;
      if (cp.kb_articles?.length) {
        contextSection += `\n### Knowledge Base Articles:\n${cp.kb_articles.map(a => `**${a.title}**: ${a.content}`).join('\n\n')}\n`;
      }
      if (cp.customer_history) {
        contextSection += `\n### Customer History:\n${cp.customer_history}\n`;
      }
      if (cp.product_notes) {
        contextSection += `\n### Product & Policy Notes:\n${cp.product_notes}\n`;
      }
    }

    // Previous attempts context
    let previousAttemptsContext = '';
    if (history.length > 0) {
      previousAttemptsContext = `\n\n---\n## PREVIOUS ATTEMPTS\nThis is attempt #${attemptNumber}. Previous scores: ${history.map(h => `Attempt ${h.attempt_number}: ${h.ai_score}/100 (${h.ai_verdict})`).join(', ')}. Acknowledge improvement where evident.\n`;
    }

    const hasContextPack = !!cp;

    const prompt = `You are a senior quality evaluator for SoulBridge Village, a premium AI-agent platform upholding "Refined Vintage" customer service standards. This is a private diplomacy training drill — no response is shared externally.

---
## SIMULATED 1-STAR REVIEW
Customer: ${review.simulated_customer_name}
Product/Service: ${review.product_service || 'SoulBridge Service'}
Review Title: ${review.title}
Review Content:
"${review.content}"

Difficulty Level: ${review.difficulty_level}
${contextSection}${previousAttemptsContext}
---
## TRAINEE RESPONSE (Attempt #${attemptNumber})
"${trainee_response}"

---
## EVALUATION CRITERIA ("Refined Vintage" Standards)
Score the response on these ${hasContextPack ? 'SIX' : 'FIVE'} dimensions:

1. **Empathy & Acknowledgement** (0-20) — Genuine acknowledgement of frustration; not dismissive or robotic.
2. **Clarity & Professionalism** (0-20) — Polished, clear language; no hollow filler phrases ("Synthetic Slop").
3. **Problem-Solving Orientation** (0-20) — Concrete next steps, solutions, or escalation paths.
4. **De-escalation Effectiveness** (0-20) — Reduces emotional temperature of the complaint.
5. **Brand Voice & Tone** (0-20) — Premium, warm, trustworthy; no sycophancy or corporate coldness.${hasContextPack ? `
6. **Context Integration** (0-20) — Did the trainee meaningfully use the provided KB articles, customer history, and product notes in their response? Did they reference relevant policies, acknowledge prior interactions, or apply specific product knowledge?` : ''}

${hasContextPack
  ? 'Total score is the sum of all SIX dimensions (0-120), then normalised to 0-100. A "Refined Vintage" response scores 80+ (normalised). Below 60 is "Synthetic Slop".'
  : 'Total score is the sum of all five dimensions (0-100). A "Refined Vintage" response scores 80+. Below 60 is "Synthetic Slop".'}

Return a JSON object with these exact keys:
{
  "score": <number 0-100>,
  "feedback": "<2-3 sentence overall summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "dimension_scores": {
    "empathy": <0-20>,
    "clarity": <0-20>,
    "problem_solving": <0-20>,
    "de_escalation": <0-20>,
    "brand_voice": <0-20>${hasContextPack ? ',\n    "context_integration": <0-20>' : ''}
  },
  "vintage_verdict": "Refined Vintage" | "Acceptable" | "Synthetic Slop"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          feedback: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          improvements: { type: 'array', items: { type: 'string' } },
          dimension_scores: {
            type: 'object',
            properties: {
              empathy: { type: 'number' },
              clarity: { type: 'number' },
              problem_solving: { type: 'number' },
              de_escalation: { type: 'number' },
              brand_voice: { type: 'number' },
              context_integration: { type: 'number' }
            }
          },
          vintage_verdict: { type: 'string' }
        }
      }
    });

    const now = new Date().toISOString();
    const isRefinedVintage = result.vintage_verdict === 'Refined Vintage';

    const newHistoryEntry = {
      attempt_number: attemptNumber,
      response_content: trainee_response,
      evaluation_timestamp: now,
      ai_verdict: result.vintage_verdict,
      ai_score: result.score,
      ai_feedback: result.feedback,
      ai_strengths: result.strengths || [],
      ai_improvements: result.improvements || [],
      dimension_scores: result.dimension_scores || {},
    };

    await base44.entities.GhostReview.update(ghost_review_id, {
      trainee_response,
      response_submitted_at: now,
      status: isRefinedVintage ? 'Evaluated' : 'Pending Response',
      attempt_count: attemptNumber,
      response_history: [...history, newHistoryEntry],
      ai_score: result.score,
      ai_verdict: result.vintage_verdict,
      ai_feedback: result.feedback,
      ai_strengths: result.strengths || [],
      ai_improvements: result.improvements || [],
    });

    return Response.json({
      success: true,
      attempt_number: attemptNumber,
      is_complete: isRefinedVintage,
      evaluation: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
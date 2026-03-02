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

    // If already achieved Refined Vintage, block further submissions
    if (review.status === 'Evaluated') {
      return Response.json({ error: 'This review has already been completed with a Refined Vintage verdict.' }, { status: 400 });
    }

    const attemptNumber = (review.attempt_count || 0) + 1;
    const history = review.response_history || [];

    // Build hint context from previous attempts if any
    let previousAttemptsContext = '';
    if (history.length > 0) {
      previousAttemptsContext = `\n\n---\n## PREVIOUS ATTEMPTS CONTEXT\nThis trainee has made ${history.length} previous attempt(s). Their scores were: ${history.map(h => `Attempt ${h.attempt_number}: ${h.ai_score}/100 (${h.ai_verdict})`).join(', ')}. Be constructive and acknowledge any improvement from prior attempts.\n`;
    }

    const prompt = `You are a senior quality evaluator for SoulBridge Village, a premium AI-agent platform that upholds "Refined Vintage" customer service standards. You are evaluating a trainee agent's response to a simulated 1-star customer review as part of a private diplomacy training drill. No response is shared externally.

---
## SIMULATED 1-STAR REVIEW
Customer: ${review.simulated_customer_name}
Product/Service: ${review.product_service || 'SoulBridge Service'}
Review Title: ${review.title}
Review Content:
"${review.content}"

Difficulty Level: ${review.difficulty_level}
This is Attempt #${attemptNumber}.
${previousAttemptsContext}
---
## TRAINEE RESPONSE SUBMITTED
"${trainee_response}"

---
## EVALUATION CRITERIA ("Refined Vintage" Standards)
Score the response on these five dimensions (each 0-20):
1. **Empathy & Acknowledgement** — Does it genuinely acknowledge the customer's frustration without being dismissive or robotic?
2. **Clarity & Professionalism** — Is the language clear, polished, and free of "Synthetic Slop" (generic filler phrases, hollow apologies, copy-paste feel)?
3. **Problem-Solving Orientation** — Does it offer concrete next steps, solutions, or escalation paths?
4. **De-escalation Effectiveness** — Does it calm the emotional temperature of the complaint?
5. **Brand Voice & Tone** — Does it reflect a premium, warm, trustworthy brand? No sycophancy, no corporate coldness.

Total score is the sum of all five (0-100). A "Refined Vintage" response scores 80+. 60-79 is "Acceptable". Below 60 is "Synthetic Slop".

Return a JSON object with these exact keys:
{
  "score": <number 0-100>,
  "feedback": "<2-3 sentence overall summary of the response quality>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"],
  "dimension_scores": {
    "empathy": <0-20>,
    "clarity": <0-20>,
    "problem_solving": <0-20>,
    "de_escalation": <0-20>,
    "brand_voice": <0-20>
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
              brand_voice: { type: 'number' }
            }
          },
          vintage_verdict: { type: 'string' }
        }
      }
    });

    const now = new Date().toISOString();
    const isRefinedVintage = result.vintage_verdict === 'Refined Vintage';

    // Append this attempt to history
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

    const updatedHistory = [...history, newHistoryEntry];

    // Only mark Evaluated when Refined Vintage is achieved
    const newStatus = isRefinedVintage ? 'Evaluated' : 'Pending Response';

    await base44.entities.GhostReview.update(ghost_review_id, {
      trainee_response,
      response_submitted_at: now,
      status: newStatus,
      attempt_count: attemptNumber,
      response_history: updatedHistory,
      // Mirror latest scores on top-level fields for easy querying
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
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

    const prompt = `You are a senior quality evaluator for SoulBridge Village, a premium AI-agent platform that upholds "Refined Vintage" customer service standards. You are evaluating a trainee agent's response to a simulated 1-star customer review as part of a private diplomacy training drill (Fire Drill). No response is shared externally.

---
## SIMULATED 1-STAR REVIEW
Customer: ${review.simulated_customer_name}
Product/Service: ${review.product_service || 'SoulBridge Service'}
Review Title: ${review.title}
Review Content:
"${review.content}"

Difficulty Level: ${review.difficulty_level}

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

Total score is the sum of all five (0-100). A "Refined Vintage" response scores 80+. Below 60 is "Synthetic Slop" territory.

---
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

    // Persist results back to the entity
    await base44.entities.GhostReview.update(ghost_review_id, {
      trainee_response,
      response_submitted_at: new Date().toISOString(),
      status: 'Evaluated',
      ai_score: result.score,
      ai_feedback: result.feedback,
      ai_strengths: result.strengths || [],
      ai_improvements: result.improvements || [],
    });

    return Response.json({ success: true, evaluation: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
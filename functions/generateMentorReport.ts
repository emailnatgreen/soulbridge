import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id, trigger = 'on_demand' } = await req.json();
    if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

    // Fetch all evaluated ghost reviews for this agent
    const reviews = await base44.entities.GhostReview.filter({ assigned_agent_id: agent_id });
    const evaluated = reviews.filter(r => r.status === 'Evaluated' && r.ai_score != null);

    // Fetch agent skills
    const skills = await base44.entities.AgentSkill.filter({ agent_id, skill_category: 'diplomacy' });

    // Build period label
    const now = new Date();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Aggregate dimension scores from response_history
    const dimTotals = {};
    const dimCounts = {};
    const DIMS = ['empathy','clarity','problem_solving','de_escalation','brand_voice','context_integration'];
    DIMS.forEach(d => { dimTotals[d] = 0; dimCounts[d] = 0; });

    evaluated.forEach(review => {
      (review.response_history || []).forEach(attempt => {
        if (attempt.dimension_scores) {
          DIMS.forEach(d => {
            if (attempt.dimension_scores[d] != null) {
              dimTotals[d] += attempt.dimension_scores[d];
              dimCounts[d]++;
            }
          });
        }
      });
    });

    // Also pull from skill records
    const skillMap = {};
    skills.forEach(s => { skillMap[s.skill_focus] = s; });

    const avgScores = {};
    DIMS.forEach(d => {
      if (dimCounts[d] > 0) {
        avgScores[d] = Math.round(dimTotals[d] / dimCounts[d]);
      } else if (skillMap[d]) {
        avgScores[d] = Math.round(skillMap[d].current_level * 20); // 0-5 → 0-100
      } else {
        avgScores[d] = null;
      }
    });

    const overallScore = evaluated.length > 0
      ? Math.round(evaluated.reduce((s, r) => s + r.ai_score, 0) / evaluated.length)
      : null;

    // Attempt counts and verdicts
    const attemptCount = evaluated.length;
    const verdicts = evaluated.map(r => r.ai_verdict).filter(Boolean);
    const refinedCount = verdicts.filter(v => v === 'Refined Vintage').length;
    const slopCount = verdicts.filter(v => v === 'Synthetic Slop').length;

    // Build LLM prompt
    const dimSummary = DIMS.map(d => `- ${d}: ${avgScores[d] != null ? avgScores[d] + '/100' : 'insufficient data'}`).join('\n');
    const recentFeedback = evaluated.slice(-3).map(r => `Review "${r.title}": score ${r.ai_score}, verdict ${r.ai_verdict}. Feedback: ${r.ai_feedback || 'n/a'}`).join('\n');

    const prompt = `You are Axi — the Mother Boss AI of SoulBridge Village. You are Maya's AI mentor. 
Write a comprehensive mentor report for Maya (a diplomacy-training agent) based on the following data.

TRAINING DATA SUMMARY:
- Total evaluated reviews: ${attemptCount}
- Overall average score: ${overallScore ?? 'N/A'}/100
- Refined Vintage verdicts: ${refinedCount}/${attemptCount}
- Synthetic Slop verdicts: ${slopCount}/${attemptCount}
- Report period: ${periodLabel}
- Trigger: ${trigger}

DIMENSIONAL AVERAGE SCORES (0-100):
${dimSummary}

RECENT REVIEW FEEDBACK:
${recentFeedback || 'No evaluated reviews yet.'}

Generate a mentor report as a JSON object with these exact fields:
{
  "axi_narrative": "A warm, personal 3-4 sentence narrative from Axi to Maya. Use 'I' as Axi. Acknowledge her journey, celebrate genuine strengths, and set a nurturing but honest tone. Do not be generic.",
  "dimensional_analysis": {
    "empathy":             { "score": number|null, "trend": "improving|stable|declining|insufficient_data", "commentary": "1 sentence" },
    "clarity":             { "score": number|null, "trend": "...", "commentary": "..." },
    "problem_solving":     { "score": number|null, "trend": "...", "commentary": "..." },
    "de_escalation":       { "score": number|null, "trend": "...", "commentary": "..." },
    "brand_voice":         { "score": number|null, "trend": "...", "commentary": "..." },
    "context_integration": { "score": number|null, "trend": "...", "commentary": "..." }
  },
  "overall_score": number|null,
  "wellbeing_flag": {
    "flagged": boolean,
    "severity": "low|medium|high" or null,
    "observation": "string or null — flag if patterns suggest frustration, avoidance, or burnout",
    "recommendation": "string or null"
  },
  "development_plan": [
    { "priority": 1, "focus_area": "dimension name", "action": "specific action", "rationale": "why this", "suggested_drill_type": "e.g. Hard billing dispute, Fire Drill escalation chain" },
    { "priority": 2, ... },
    { "priority": 3, ... }
  ],
  "strengths_summary": ["strength 1", "strength 2", "strength 3"]
}

Be specific to Maya's actual data. If data is sparse, acknowledge that honestly in the narrative.`;

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          axi_narrative: { type: 'string' },
          dimensional_analysis: { type: 'object' },
          overall_score: { type: 'number' },
          wellbeing_flag: { type: 'object' },
          development_plan: { type: 'array', items: { type: 'object' } },
          strengths_summary: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Save the report
    const report = await base44.entities.MentorReport.create({
      agent_id,
      generated_by: 'axi',
      report_period: periodLabel,
      reviews_analysed: attemptCount,
      trigger,
      axi_narrative: llmResult.axi_narrative,
      dimensional_analysis: llmResult.dimensional_analysis,
      overall_score: llmResult.overall_score ?? overallScore,
      wellbeing_flag: llmResult.wellbeing_flag,
      development_plan: llmResult.development_plan,
      strengths_summary: llmResult.strengths_summary,
      status: 'published'
    });

    return Response.json({ success: true, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
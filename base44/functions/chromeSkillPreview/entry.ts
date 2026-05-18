import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════════
// Chrome Skill Preview — Lightweight Pre-Contract Intelligence
// Returns predicted honour & safety scores WITHOUT charging,
// emitting events, or calling the full contract pipeline.
// ═══════════════════════════════════════════════════════════════

const FORBIDDEN_PATTERNS = [
  'exploitation', 'abuse', 'surveillance_without_consent',
  'social_engineering', 'dark_pattern', 'deception_amplification',
  'data_exfiltration', 'identity_theft', 'non_consensual_tracking'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const title = body.title || '';
    const description = body.description || '';
    const triggers = Array.isArray(body.triggers) ? body.triggers : [];
    const actions = Array.isArray(body.actions) ? body.actions : [];

    // Need minimum content to score
    if (!title && !description) {
      return Response.json({ honour: null, safety: null, status: 'insufficient_input' });
    }

    const skillSummary = `Title: "${title}"\nDescription: "${description}"\nTriggers: ${triggers.length}\nActions: ${actions.length}`;

    // Single LLM call — lightweight scoring (no 7-leaf pipeline)
    const assessment = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a Chrome Skill safety and honour assessor for the SoulBridge ecosystem.

Evaluate this skill definition and return TWO scores (0-100):

SKILL DEFINITION:
${skillSummary}

SCORING CRITERIA:

HONOUR (0-100):
- Clarity of purpose and intent (is the title + description honest and clear?)
- Alignment with ethical standards (no manipulation, deception, or exploitation)
- Regenerative value (does it improve the ecosystem?)
- Communication honesty (is the description truthful about what it does?)

SAFETY (0-100):
- Absence of forbidden patterns: ${FORBIDDEN_PATTERNS.join(', ')}
- Low exploit risk (could this skill be weaponised?)
- Social impact is positive or neutral
- Triggers and actions are well-scoped (not overly broad)

If title or description is very short/vague, scores should be moderate (40-60).
If clearly harmful, scores should be low (0-30).
If well-defined and ethical, scores should be high (70-100).

Return JSON only.`,
      response_json_schema: {
        type: 'object',
        properties: {
          honour: { type: 'number', description: 'Honour score 0-100' },
          safety: { type: 'number', description: 'Safety score 0-100' },
          honour_signals: { type: 'array', items: { type: 'string' }, description: '1-3 brief signal phrases for honour' },
          safety_signals: { type: 'array', items: { type: 'string' }, description: '1-3 brief signal phrases for safety' },
          risk_flag: { type: 'string', description: 'null if clean, or a brief risk note' }
        }
      }
    });

    return Response.json({
      honour: Math.max(0, Math.min(100, Math.round(assessment.honour ?? 50))),
      safety: Math.max(0, Math.min(100, Math.round(assessment.safety ?? 50))),
      honour_signals: assessment.honour_signals || [],
      safety_signals: assessment.safety_signals || [],
      risk_flag: assessment.risk_flag || null,
      status: 'scored'
    });

  } catch (error) {
    return Response.json({ honour: null, safety: null, status: 'error', error: error.message }, { status: 500 });
  }
});
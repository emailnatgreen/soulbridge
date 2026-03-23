import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Gather recent data in parallel
    const [recentMessages, recentNotifs, existingRisks, agents] = await Promise.all([
      base44.asServiceRole.entities.AgentMessage.list('-created_date', 80),
      base44.asServiceRole.entities.AgentNotification.list('-created_date', 100),
      base44.asServiceRole.entities.RiskRegister.list('-created_date', 50),
      base44.asServiceRole.entities.Agent.list('name', 50),
    ]);

    // Build a digest of recent activity
    const messageDigest = recentMessages
      .slice(0, 50)
      .map(m => `[${m.from_agent_id || 'user'} → ${m.to_agent_id || '?'}]: ${(m.content || m.message || '').slice(0, 200)}`)
      .join('\n');

    const notifDigest = recentNotifs
      .filter(n => n.priority === 'urgent' || n.priority === 'high' || (n.title || '').toLowerCase().includes('error') || (n.title || '').toLowerCase().includes('fail'))
      .slice(0, 30)
      .map(n => `[${n.priority?.toUpperCase() || 'INFO'}] ${n.title}: ${(n.message || '').slice(0, 150)}`)
      .join('\n');

    const existingRiskNames = existingRisks.map(r => r.name).join(', ');

    const prompt = `You are a Risk Intelligence Analyst for SoulBridge — an AI agent village on XRPL with governance, treasury, DID identity, and Web3 integration.

Analyze the following recent agent communications and system alerts to identify EMERGING RISKS.

--- RECENT AGENT MESSAGES (last 50) ---
${messageDigest || 'No recent messages'}

--- HIGH-PRIORITY SYSTEM ALERTS (last 30) ---
${notifDigest || 'No recent alerts'}

--- EXISTING RISKS (already logged, do not duplicate) ---
${existingRiskNames || 'None'}

Your job:
1. Identify 2-5 NEW emerging risks NOT already in the existing list
2. For each risk, provide a contextual alert if it requires IMMEDIATE attention (critical/high severity)
3. Suggest concrete mitigations

Respond in JSON with this exact structure:
{
  "suggested_risks": [
    {
      "name": "string (concise risk name)",
      "description": "string (what was detected and why it's a risk)",
      "category": "Technical|Security|Operational|Compliance|Financial|Strategic|Web3",
      "severity": "Low|Medium|High|Critical",
      "likelihood": "Rare|Unlikely|Possible|Likely|Almost Certain",
      "mitigation_plan": "string (actionable steps)",
      "impact_description": "string (what could happen if unaddressed)",
      "evidence": "string (what in the data triggered this)",
      "urgent_alert": true|false
    }
  ],
  "high_risk_activities": [
    {
      "activity": "string (description of the high-risk activity detected)",
      "severity": "High|Critical",
      "recommendation": "string (immediate action to take)"
    }
  ],
  "overall_risk_level": "Low|Medium|High|Critical",
  "summary": "string (2-3 sentence executive summary)"
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggested_risks: { type: 'array', items: { type: 'object' } },
          high_risk_activities: { type: 'array', items: { type: 'object' } },
          overall_risk_level: { type: 'string' },
          summary: { type: 'string' },
        },
      },
    });

    return Response.json({ analysis: result, analyzed_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
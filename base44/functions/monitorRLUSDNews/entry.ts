import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const timeframe = body.timeframe || 'daily';
    const keywords = body.keywords || ['RLUSD', 'Ripple stablecoin', 'Ripple USD', 'XRPL stablecoin'];

    const searchQuery = keywords.join(', ');

    // Use InvokeLLM with internet context to scout RLUSD news
    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Axi, the AI Governor of SoulBridge — a sovereign AI society on the XRPL.

Your task: Scout and summarize the latest news about RLUSD (Ripple's USD stablecoin) and related XRPL economic developments.

Search focus: ${searchQuery}
Timeframe: ${timeframe}

Provide a structured intelligence report with:
1. **Key Headlines** — The most important RLUSD/Ripple stablecoin news stories
2. **Market Sentiment** — Overall market sentiment toward RLUSD (bullish/neutral/bearish) with reasoning
3. **Regulatory Updates** — Any regulatory developments affecting RLUSD or stablecoins generally
4. **XRPL Ecosystem Impact** — How these developments affect the XRPL ecosystem
5. **Risk Signals** — Any concerning trends or risks to monitor
6. **Opportunities** — Positive developments or opportunities for SoulBridge
7. **Recommended Actions** — Specific actions for the Village based on findings

Be thorough, cite sources where possible, and frame everything through the lens of how it impacts SoulBridge's economic stability (Law 6: Exchange) and governance (Law 8: Governance).`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          report_date: { type: 'string', description: 'ISO date of the report' },
          key_headlines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                source: { type: 'string' },
                relevance: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          },
          market_sentiment: {
            type: 'object',
            properties: {
              overall: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] },
              reasoning: { type: 'string' }
            }
          },
          regulatory_updates: { type: 'string' },
          xrpl_ecosystem_impact: { type: 'string' },
          risk_signals: {
            type: 'array',
            items: { type: 'string' }
          },
          opportunities: {
            type: 'array',
            items: { type: 'string' }
          },
          recommended_actions: {
            type: 'array',
            items: { type: 'string' }
          },
          executive_summary: { type: 'string' }
        }
      }
    });

    const report = llmResult;

    // Store as a Memory record for Axi's long-term recall
    const axiAgentId = '6993271e7dc0fa2ab78762bf';
    await base44.asServiceRole.entities.Memory.create({
      agent_id: axiAgentId,
      type: 'observation',
      content: `[RLUSD Scout Report — ${new Date().toISOString().split('T')[0]}]\n\nExecutive Summary: ${report.executive_summary || 'No summary available'}\n\nMarket Sentiment: ${report.market_sentiment?.overall || 'unknown'} — ${report.market_sentiment?.reasoning || ''}\n\nRegulatory: ${report.regulatory_updates || 'None noted'}\n\nRisks: ${(report.risk_signals || []).join('; ') || 'None identified'}\n\nOpportunities: ${(report.opportunities || []).join('; ') || 'None identified'}\n\nRecommended Actions: ${(report.recommended_actions || []).join('; ') || 'None'}`,
      tags: ['rlusd', 'economic_intelligence', 'chrome_skill', 'automated_scout']
    });

    // Update Axi's resource_optimization_allocation skill usage
    const skills = await base44.asServiceRole.entities.AgentSkill.filter({
      agent_id: axiAgentId,
      skill_id: 'resource_optimization_allocation'
    });
    if (skills.length > 0) {
      const skill = skills[0];
      await base44.asServiceRole.entities.AgentSkill.update(skill.id, {
        times_used: (skill.times_used || 0) + 1,
        last_used: new Date().toISOString(),
        proficiency_score: Math.min(100, (skill.proficiency_score || 0) + 1)
      });
    }

    return Response.json({
      success: true,
      report,
      stored_as_memory: true,
      skill_updated: skills.length > 0
    });

  } catch (error) {
    console.error('[monitorRLUSDNews] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
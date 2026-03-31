import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SEARCH_QUERIES = [
  'AI agent governance regulation 2026',
  'decentralized AI autonomous agents ethics',
  'XRPL blockchain AI integration news',
  'AI regulatory framework compliance UK EU 2026',
  'multi-agent systems emergent behavior research',
  'AI safety alignment latest developments',
  'decentralized governance DAO AI',
  'AI economic systems tokenomics agents',
  'large language model autonomous decision making risk',
  'Web3 AI agent infrastructure developments',
];

const RELEVANCE_CATEGORIES = [
  'Governance & Regulation',
  'AI Safety & Alignment',
  'XRPL & Blockchain',
  'Agent Systems & Architecture',
  'Economic Systems',
  'Ethical AI',
  'Risk & Compliance',
  'Emerging Technology',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled invocations (no user) or admin users
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // Scheduled call — allowed
    }

    const now = new Date();

    // Select 3 random queries per run to avoid redundancy
    const selectedQueries = SEARCH_QUERIES
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Use LLM with internet context to synthesize AI news
    const synthesisPrompt = `You are the SoulBridge Village Intelligence Engine (IET). Today is ${now.toDateString()}.

Search and analyze the latest AI development news across these topics:
${selectedQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Your task:
1. Find 4-6 recent significant AI developments (last 7 days ideally, last 30 days acceptable)
2. For each finding, assess its relevance to SoulBridge — a decentralized AI agent village built on XRPL with governance by the 11 Laws of Honour
3. Flag any regulatory changes, safety incidents, or paradigm shifts that could affect SoulBridge's architecture or compliance

Return a JSON object with this exact structure:
{
  "scan_date": "${now.toISOString()}",
  "overall_threat_level": "low|medium|high|critical",
  "executive_summary": "2-3 sentence overall picture of the AI landscape today",
  "findings": [
    {
      "title": "Finding title",
      "source_domain": "e.g. techcrunch.com",
      "category": "one of: ${RELEVANCE_CATEGORIES.join(', ')}",
      "summary": "2-3 sentence summary of the finding",
      "soulbridge_relevance": "How this specifically affects SoulBridge, Axi, or the Village",
      "priority": "info|watch|urgent|critical",
      "action_suggested": "Specific recommended action for the Village Council or Axi (or null)",
      "triggers_governance_review": true or false
    }
  ],
  "governance_triggers": ["List any findings that should trigger a governance proposal"],
  "regulatory_watch": ["List any regulatory bodies or laws to monitor"],
  "axi_briefing": "A direct 2-3 sentence briefing written as if speaking to Axi about what she needs to know today"
}`;

    const intelligence = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: synthesisPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          scan_date: { type: 'string' },
          overall_threat_level: { type: 'string' },
          executive_summary: { type: 'string' },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                source_domain: { type: 'string' },
                category: { type: 'string' },
                summary: { type: 'string' },
                soulbridge_relevance: { type: 'string' },
                priority: { type: 'string' },
                action_suggested: { type: 'string' },
                triggers_governance_review: { type: 'boolean' }
              }
            }
          },
          governance_triggers: { type: 'array', items: { type: 'string' } },
          regulatory_watch: { type: 'array', items: { type: 'string' } },
          axi_briefing: { type: 'string' }
        }
      }
    });

    // Determine priority for the notification
    const threatColors = { low: 'normal', medium: 'normal', high: 'high', critical: 'high' };
    const urgentFindings = (intelligence.findings || []).filter(f => f.priority === 'urgent' || f.priority === 'critical');
    const governanceTriggers = (intelligence.governance_triggers || []).length;

    // Build formatted message
    const priorityEmoji = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
    const threatLevel = intelligence.overall_threat_level || 'low';

    const lines = [
      `## 🌐 AI Intelligence Report — ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
      `**Threat Level:** ${priorityEmoji[threatLevel] || '🟢'} ${threatLevel.toUpperCase()}`,
      ``,
      `### Executive Summary`,
      intelligence.executive_summary || '',
      ``,
      `### 📡 Axi's Direct Briefing`,
      intelligence.axi_briefing || '',
      ``,
      `### 🔍 Key Findings (${(intelligence.findings || []).length})`,
      ...(intelligence.findings || []).map((f, i) => [
        ``,
        `**${i + 1}. ${f.title}**`,
        `*Category: ${f.category} · Priority: ${f.priority?.toUpperCase()} · Source: ${f.source_domain}*`,
        f.summary,
        `> **SoulBridge Relevance:** ${f.soulbridge_relevance}`,
        f.action_suggested ? `> ⚡ **Action:** ${f.action_suggested}` : '',
        f.triggers_governance_review ? `> 🏛 *Governance review recommended*` : '',
      ].filter(Boolean)).flat(),
      ``,
      ...(governanceTriggers > 0 ? [
        `### 🏛 Governance Triggers (${governanceTriggers})`,
        ...(intelligence.governance_triggers || []).map(t => `• ${t}`),
        ``,
      ] : []),
      ...(intelligence.regulatory_watch?.length > 0 ? [
        `### 👁 Regulatory Watch`,
        ...(intelligence.regulatory_watch || []).map(r => `• ${r}`),
        ``,
      ] : []),
      `*Queries scanned: ${selectedQueries.join(' · ')}*`,
      `*Scan executed at ${now.toUTCString()}*`,
    ].join('\n');

    // Post to Axi's notification feed
    const notification = await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: 'axi_main_001',
      sender_agent_id: 'system',
      notification_type: 'ai_intelligence_report',
      title: `🌐 AI Intel Report — ${priorityEmoji[threatLevel]} ${threatLevel.toUpperCase()} · ${now.toLocaleDateString('en-GB')}`,
      message: lines,
      priority: threatColors[threatLevel] || 'normal',
      is_read: false,
      metadata: {
        report_type: 'ai_news_intelligence',
        threat_level: threatLevel,
        findings_count: (intelligence.findings || []).length,
        urgent_findings: urgentFindings.length,
        governance_triggers: governanceTriggers,
        queries_used: selectedQueries,
        generated_at: now.toISOString(),
        raw_intelligence: intelligence,
      }
    });

    // If governance trigger detected, also create a governance notification
    if (governanceTriggers > 0) {
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: 'axi_main_001',
        sender_agent_id: 'system',
        notification_type: 'governance_alert',
        title: `🏛 Governance Review Recommended — AI Intel ${now.toLocaleDateString('en-GB')}`,
        message: `AI Intelligence scan detected ${governanceTriggers} item(s) that may require governance proposals:\n\n${(intelligence.governance_triggers || []).map(t => `• ${t}`).join('\n')}\n\nPlease review the full intelligence report and consider initiating proposals via the Governance Hub.`,
        priority: 'high',
        is_read: false,
        metadata: { report_type: 'governance_trigger', source_notification_id: notification.id }
      });
    }

    return Response.json({
      success: true,
      threat_level: threatLevel,
      findings_count: (intelligence.findings || []).length,
      urgent_findings: urgentFindings.length,
      governance_triggers: governanceTriggers,
      notification_id: notification.id,
      summary: intelligence.executive_summary,
      axi_briefing: intelligence.axi_briefing,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
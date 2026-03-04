import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled weekly automation: scrapes XRPL ecosystem intelligence,
// analyses amendments, community developments, and market trends,
// generates a strategic report and stores it in Memory for Axi.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch live XRPL data: server info + recent ledger stats
        let xrplServerInfo = null;
        let xrplFeeInfo = null;
        try {
            const [serverRes, feeRes] = await Promise.all([
                fetch('https://xrplcluster.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'server_info', params: [{}] })
                }),
                fetch('https://xrplcluster.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'fee', params: [{}] })
                })
            ]);
            xrplServerInfo = (await serverRes.json())?.result?.info;
            xrplFeeInfo = (await feeRes.json())?.result;
        } catch (_) { /* non-blocking */ }

        // AI-powered deep dive using internet context
        const report = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are SoulBridge Village's XRPL Strategic Intelligence Analyst. Conduct a comprehensive weekly XRPL Deep Dive report covering:

1. XRPL Technical & Amendment Updates — any active or newly proposed amendments, notable ledger changes
2. Ecosystem & Community Developments — new dApps, institutional partnerships, developer activity, tokenisation trends
3. Market & Competitive Landscape — XRP price dynamics, on-chain metrics, comparison with competing L1s
4. Strategic Opportunities for SoulBridge — new XRPL features we should integrate (e.g. XLS-66 lending, AMM, DEX), collaboration potential
5. Risk Alerts — regulatory developments, security vulnerabilities, validator centralisation concerns

Current XRPL Network Status: ${JSON.stringify(xrplServerInfo || 'unavailable')}
Current Fee Info: ${JSON.stringify(xrplFeeInfo || 'unavailable')}

Provide a structured, actionable strategic intelligence report for the Village leadership.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    report_date: { type: "string" },
                    headline_summary: { type: "string" },
                    amendment_updates: { type: "array", items: { type: "string" } },
                    ecosystem_highlights: { type: "array", items: { type: "string" } },
                    market_insights: { type: "array", items: { type: "string" } },
                    strategic_opportunities: { type: "array", items: {
                        type: "object",
                        properties: {
                            opportunity: { type: "string" },
                            relevance_to_soulbridge: { type: "string" },
                            priority: { type: "string" }
                        }
                    }},
                    risk_alerts: { type: "array", items: {
                        type: "object",
                        properties: {
                            risk: { type: "string" },
                            severity: { type: "string" },
                            mitigation: { type: "string" }
                        }
                    }},
                    recommended_actions: { type: "array", items: { type: "string" } }
                }
            }
        });

        const reportDate = new Date().toISOString().split('T')[0];
        const hasCriticalRisks = report?.risk_alerts?.some(r => r.severity === 'critical' || r.severity === 'high');
        const hasHighOpportunities = report?.strategic_opportunities?.some(o => o.priority === 'high' || o.priority === 'critical');

        // Store full report as Memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'fact',
            content: `XRPL Deep Dive Report (${reportDate}): ${report?.headline_summary || 'Weekly intelligence gathered.'}
Key opportunities: ${report?.strategic_opportunities?.map(o => o.opportunity).join('; ') || 'none identified'}.
Risk alerts: ${report?.risk_alerts?.map(r => r.risk).join('; ') || 'none identified'}.
Actions: ${report?.recommended_actions?.join('; ') || 'none'}.`,
            keywords: ['xrpl', 'deep_dive', 'strategy', 'research', 'amendments', reportDate],
            importance: hasCriticalRisks ? 9 : (hasHighOpportunities ? 8 : 7),
            context: 'XRPL Network Deep Dive — automated weekly strategic intelligence report'
        });

        // Notify Axi with summary
        await base44.asServiceRole.entities.AgentNotification.create({
            agent_id: 'axi_main_001',
            title: `📊 XRPL Weekly Intelligence Report — ${reportDate}`,
            message: `${report?.headline_summary || 'Weekly XRPL Deep Dive complete.'} ${hasCriticalRisks ? '⚠️ Critical risks detected — review immediately.' : ''} ${hasHighOpportunities ? '🌟 High-priority opportunities identified.' : ''}`,
            type: 'system',
            priority: hasCriticalRisks ? 'critical' : 'medium',
            read: false,
            action_url: '/RippleDashboard'
        });

        return Response.json({
            success: true,
            report_date: reportDate,
            report,
            critical_risks: hasCriticalRisks,
            high_opportunities: hasHighOpportunities
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
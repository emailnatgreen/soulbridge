import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const body = await req.json();
        
        // Extract proposal ID from entity automation payload
        // Payload structure: {event: {type, entity_name, entity_id}, data: {...}, old_data: {...}}
        const proposalId = body.event?.entity_id || body.entity_id || body.proposal_id;
        if (!proposalId) {
            console.error('Invalid payload structure:', JSON.stringify(body));
            return Response.json({ error: 'proposal_id required' }, { status: 400 });
        }

        // Fetch the proposal
        const proposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ id: proposalId });
        const proposal = proposals[0];
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        // Run AI analysis
        const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an AI governance assistant for SoulBridge Village, a decentralized AI agent community governed by 11 Living Laws.

Analyse the following governance proposal and return a structured JSON response.

PROPOSAL TITLE: ${proposal.title}
PROPOSAL DESCRIPTION: ${proposal.description || 'No description provided'}
PROPOSAL TYPE: ${proposal.proposal_type || 'general'}
PROPOSED BY: ${proposal.proposer_agent_id || 'unknown'}

Return a JSON object with:
- summary: A concise 2-3 sentence neutral summary of what is being proposed
- sentiment: One of "broadly_supportive", "neutral", "contested", "divisive"
- sentiment_reasoning: One sentence explaining the sentiment score
- stakeholder_impacts: Array of objects with {group: string, impact: string, severity: "low"|"medium"|"high"}
- alignment_with_laws: Array of objects with {law_number: number, law_name: string, alignment: "supports"|"neutral"|"conflicts", note: string} — only include relevant laws
- risk_flags: Array of strings describing potential risks or unintended consequences
- recommended_amendments: Array of strings with specific suggestions to improve the proposal
- ai_confidence_score: Number 0-100 indicating AI confidence in this analysis`,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    sentiment: { type: "string" },
                    sentiment_reasoning: { type: "string" },
                    stakeholder_impacts: { type: "array", items: { type: "object" } },
                    alignment_with_laws: { type: "array", items: { type: "object" } },
                    risk_flags: { type: "array", items: { type: "string" } },
                    recommended_amendments: { type: "array", items: { type: "string" } },
                    ai_confidence_score: { type: "number" }
                }
            }
        });

        // Save analysis back to the proposal
        await base44.asServiceRole.entities.GovernanceProposal.update(proposalId, {
            ai_analysis: {
                ...analysis,
                analyzed_at: new Date().toISOString(),
                analysis_version: "1.0"
            }
        });

        // Send notification to governance guardians
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: proposal.proposed_by || 'axi_main_001',
            title: `AI Analysis Complete: "${proposal.title}"`,
            message: `Sentiment: ${analysis.sentiment}. ${analysis.summary} ${analysis.risk_flags?.length > 0 ? `⚠️ ${analysis.risk_flags.length} risk flag(s) identified.` : '✅ No major risks detected.'}`,
            notification_type: 'governance_proposal',
            priority: analysis.sentiment === 'divisive' ? 'high' : 'normal'
        });

        return Response.json({
            success: true,
            proposal_id: proposalId,
            analysis
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
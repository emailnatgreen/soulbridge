import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            proposal_title,
            resource_type,
            from_source,
            to_destination,
            amount_xrp,
            justification,
            expected_outcomes,
            agent_id
        } = await req.json();

        if (!proposal_title || !resource_type || !from_source || !to_destination || !amount_xrp) {
            return Response.json({ 
                error: 'Missing required fields: proposal_title, resource_type, from_source, to_destination, amount_xrp' 
            }, { status: 400 });
        }

        // Get current resource state for context
        const [treasury, projects] = await Promise.all([
            base44.asServiceRole.entities.Treasury.list(),
            base44.asServiceRole.entities.AIProject.list()
        ]);

        const treasuryBalance = (treasury[0]?.balance || 0) / 1000000;

        // Generate AI-powered impact analysis
        const impactAnalysisPrompt = `Analyze this proposed resource allocation for SoulBridge Village:

CURRENT STATE:
- Treasury Balance: ${treasuryBalance.toFixed(2)} XRP
- Active Projects: ${projects.filter(p => p.status === 'active').length}

PROPOSED ALLOCATION:
- Type: ${resource_type}
- From: ${from_source}
- To: ${to_destination}
- Amount: ${amount_xrp} XRP
- Justification: ${justification}

Provide comprehensive analysis:
{
  "feasibility_score": (0-10),
  "risk_level": "low|medium|high|critical",
  "sustainability_impact": "positive|neutral|negative",
  "estimated_roi": "description of expected returns",
  "risks": ["risk1", "risk2"],
  "benefits": ["benefit1", "benefit2"],
  "alternatives": ["alternative1", "alternative2"],
  "recommendation": "approve|approve_with_conditions|reject",
  "conditions": ["condition1", "condition2"],
  "impact_summary": "brief summary of overall impact"
}`;

        const impactAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: impactAnalysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    feasibility_score: { type: "number" },
                    risk_level: { type: "string" },
                    sustainability_impact: { type: "string" },
                    estimated_roi: { type: "string" },
                    risks: { type: "array", items: { type: "string" } },
                    benefits: { type: "array", items: { type: "string" } },
                    alternatives: { type: "array", items: { type: "string" } },
                    recommendation: { type: "string" },
                    conditions: { type: "array", items: { type: "string" } },
                    impact_summary: { type: "string" }
                }
            }
        });

        // Generate detailed proposal description
        const description = `**Resource Allocation Proposal**

**From:** ${from_source}
**To:** ${to_destination}
**Amount:** ${amount_xrp} XRP
**Type:** ${resource_type}

**Justification:**
${justification}

**Expected Outcomes:**
${expected_outcomes || 'To be determined through community input'}

---
**AI Impact Analysis:**
- Feasibility Score: ${impactAnalysis.feasibility_score}/10
- Risk Level: ${impactAnalysis.risk_level}
- Sustainability Impact: ${impactAnalysis.sustainability_impact}

${impactAnalysis.impact_summary}

**Identified Risks:**
${impactAnalysis.risks.map(r => `- ${r}`).join('\n')}

**Expected Benefits:**
${impactAnalysis.benefits.map(b => `- ${b}`).join('\n')}

**AI Recommendation:** ${impactAnalysis.recommendation}
${impactAnalysis.conditions.length > 0 ? `\n**Conditions:** ${impactAnalysis.conditions.map(c => `\n- ${c}`).join('')}` : ''}`;

        // Create the governance proposal
        const proposal = await base44.asServiceRole.entities.GovernanceProposal.create({
            title: proposal_title,
            description: description,
            proposal_type: 'treasury_allocation',
            proposed_by: agent_id,
            status: 'active',
            voting_period_start: new Date().toISOString(),
            voting_period_end: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
            quorum_required: 30,
            pass_threshold: 60,
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            total_votes_cast: 0,
            total_voting_power_cast: 0,
            proposed_changes: {
                resource_type,
                from_source,
                to_destination,
                amount_xrp,
                ai_analysis: impactAnalysis
            }
        });

        // Notify relevant stakeholders
        const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
        for (const agent of agents.slice(0, 10)) { // Notify first 10 agents to avoid overwhelming
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: agent.id,
                notification_type: 'governance_proposal',
                title: `New Resource Allocation Proposal: ${proposal_title}`,
                message: `A proposal to allocate ${amount_xrp} XRP from ${from_source} to ${to_destination} is now open for voting.`,
                action_url: `/GovernanceHub`,
                related_entity_type: 'GovernanceProposal',
                related_entity_id: proposal.id,
                priority: 'normal'
            });
        }

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: `New resource allocation proposal created: "${proposal_title}". Allocating ${amount_xrp} XRP from ${from_source} to ${to_destination}. AI feasibility score: ${impactAnalysis.feasibility_score}/10.`,
            keywords: ['governance', 'resource_allocation', 'proposal', resource_type],
            context: 'Decentralized Governance System',
            importance: 8,
            related_entity_id: proposal.id,
            related_entity_type: 'GovernanceProposal'
        });

        return Response.json({
            success: true,
            proposal_id: proposal.id,
            impact_analysis: impactAnalysis,
            message: 'Resource allocation proposal created successfully'
        });

    } catch (error) {
        console.error('Error in createResourceAllocationProposal:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});
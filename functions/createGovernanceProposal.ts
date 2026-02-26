import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            proposer_agent_id,
            title,
            description,
            proposal_type,
            voting_period_days = 7,
            execution_details
        } = await req.json();

        if (!proposer_agent_id || !title || !description || !proposal_type) {
            return Response.json({ 
                error: 'Missing required fields: proposer_agent_id, title, description, proposal_type' 
            }, { status: 400 });
        }

        // Verify proposer is a valid active agent
        const proposer = await base44.entities.Agent.get(proposer_agent_id);
        if (!proposer || proposer.status !== 'active') {
            return Response.json({ 
                error: 'Proposer must be an active agent' 
            }, { status: 400 });
        }

        // AI-powered proposal impact assessment
        const impactPrompt = `You are a governance advisor for SoulBridge Village. Analyze this proposal and assess its potential impact.

PROPOSAL:
Title: ${title}
Type: ${proposal_type}
Description: ${description}

Provide impact assessment:
{
  "alignment_with_constitution": (0-10),
  "economic_impact": "positive|negative|neutral",
  "estimated_cost_xrp": number,
  "affected_stakeholders": ["stakeholder1", "stakeholder2"],
  "risk_level": "low|medium|high|critical",
  "potential_benefits": ["benefit1", "benefit2"],
  "potential_risks": ["risk1", "risk2"],
  "implementation_complexity": "low|medium|high",
  "recommended_voting_threshold": number (50-100),
  "constitutional_considerations": "brief analysis of constitutional alignment"
}`;

        const impactAssessment = await base44.integrations.Core.InvokeLLM({
            prompt: impactPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    alignment_with_constitution: { type: "number" },
                    economic_impact: { type: "string" },
                    estimated_cost_xrp: { type: "number" },
                    affected_stakeholders: { type: "array", items: { type: "string" } },
                    risk_level: { type: "string" },
                    potential_benefits: { type: "array", items: { type: "string" } },
                    potential_risks: { type: "array", items: { type: "string" } },
                    implementation_complexity: { type: "string" },
                    recommended_voting_threshold: { type: "number" },
                    constitutional_considerations: { type: "string" }
                }
            }
        });

        // Calculate voting deadline
        const votingDeadline = new Date();
        votingDeadline.setDate(votingDeadline.getDate() + voting_period_days);

        // Create the proposal
        const proposal = await base44.asServiceRole.entities.GovernanceProposal.create({
            proposer_agent_id: proposer_agent_id,
            title: title,
            description: description,
            proposal_type: proposal_type,
            status: 'active',
            voting_deadline: votingDeadline.toISOString(),
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            quorum_threshold: 30,
            approval_threshold: impactAssessment.recommended_voting_threshold || 66,
            execution_details: execution_details || {},
            ai_impact_assessment: impactAssessment
        });

        // Notify all agents about new proposal
        const allAgents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
        
        for (const agent of allAgents) {
            if (agent.id !== proposer_agent_id) {
                await base44.asServiceRole.entities.AgentNotification.create({
                    recipient_agent_id: agent.id,
                    notification_type: 'governance_proposal',
                    title: `New Governance Proposal: ${title}`,
                    message: `${proposer.name} has submitted a ${proposal_type} proposal. Vote before ${votingDeadline.toLocaleDateString()}.`,
                    action_url: `/GovernanceHub`,
                    related_entity_type: 'GovernanceProposal',
                    related_entity_id: proposal.id,
                    priority: impactAssessment.risk_level === 'critical' ? 'urgent' : 'high'
                });
            }
        }

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: `New governance proposal "${title}" submitted by ${proposer.name}. Type: ${proposal_type}. Risk: ${impactAssessment.risk_level}. Constitutional alignment: ${impactAssessment.alignment_with_constitution}/10.`,
            keywords: ['governance', 'proposal', proposal_type, proposer.name.toLowerCase()],
            context: 'Decentralized Governance System',
            importance: 8,
            related_entity_id: proposal.id,
            related_entity_type: 'GovernanceProposal'
        });

        return Response.json({
            success: true,
            proposal: proposal,
            impact_assessment: impactAssessment,
            voting_deadline: votingDeadline.toISOString()
        });

    } catch (error) {
        console.error('Error in createGovernanceProposal:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});
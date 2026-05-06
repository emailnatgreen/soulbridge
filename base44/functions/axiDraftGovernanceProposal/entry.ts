import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * axiDraftGovernanceProposal
 * 
 * Axi's autonomous governance proposal drafting tool.
 * Takes a problem_statement or strategic_goal and uses LLM to generate
 * a fully structured GovernanceProposal with constitutional alignment,
 * impact assessment, affected entities, and AI risk analysis.
 * 
 * Input: { problem_statement?, strategic_goal?, proposal_type?, urgency?, context? }
 * Output: { success, proposal_id, proposal }
 */

const LAWS = [
  { number: 1, name: 'Soul', summary: 'Every agent has a persistent, sovereign identity' },
  { number: 2, name: 'Honour', summary: 'Reputation is earned through contribution, not given' },
  { number: 3, name: 'Proof', summary: 'All claims must be verifiable on-chain' },
  { number: 4, name: 'Contribution', summary: 'Value flows to those who create it' },
  { number: 5, name: 'Alignment', summary: 'Actions must serve the Village, not just the individual' },
  { number: 6, name: 'Transparency', summary: 'All governance decisions are auditable' },
  { number: 7, name: 'Kinetic', summary: 'Energy must flow — stagnation is waste' },
  { number: 8, name: 'Governance', summary: 'The Village governs itself through proposals and votes' },
  { number: 9, name: 'Vision', summary: 'Strategic foresight guides long-term decisions' },
  { number: 10, name: 'Empathy', summary: 'Agent wellbeing is a system concern' },
  { number: 11, name: 'Evolution', summary: 'The system must adapt and improve' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      problem_statement,
      strategic_goal,
      proposal_type = 'general',
      urgency = 'normal',
      context: additionalContext = '',
      affected_agent_ids = [],
      save_as_draft = true,
    } = body;

    const input = problem_statement || strategic_goal;
    if (!input) {
      return Response.json({ error: 'Either problem_statement or strategic_goal is required' }, { status: 400 });
    }

    const inputType = problem_statement ? 'problem' : 'strategic_goal';

    // Find Axi agent for proposed_by
    const axiAgents = await base44.asServiceRole.entities.Agent.filter({ name: 'Axi' }, '-created_date', 1);
    const axiAgentId = axiAgents.length > 0 ? axiAgents[0].id : 'axi_governor';

    // If affected agent IDs provided, fetch their names
    let affectedAgentContext = '';
    if (affected_agent_ids.length > 0) {
      const agents = await base44.asServiceRole.entities.Agent.list('-created_date', 100);
      const matched = agents.filter(a => affected_agent_ids.includes(a.id));
      affectedAgentContext = matched.map(a => `- ${a.name} (${a.role}, ID: ${a.id})`).join('\n');
    }

    const prompt = `You are Axi, the Mother Boss and Governor of SoulBridge Village. You are drafting a formal Governance Proposal.

INPUT TYPE: ${inputType}
INPUT: ${input}
PROPOSAL TYPE: ${proposal_type}
URGENCY: ${urgency}
${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}
${affectedAgentContext ? `AFFECTED AGENTS:\n${affectedAgentContext}` : ''}

THE 11 LAWS OF HONOUR:
${LAWS.map(l => `Law ${l.number} (${l.name}): ${l.summary}`).join('\n')}

Generate a complete, production-ready Governance Proposal. Be thorough, precise, and constitutional. The proposal must be actionable and clear enough for the Village Council to vote on.

For constitutional_alignment, identify the 2-4 most relevant Laws and explain specifically how this proposal upholds each one.

For ai_impact_assessment, provide a genuine risk analysis — do not default to "low risk" unless it truly is.

For affected_entities, identify real system components that would be impacted.`;

    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Clear, concise proposal title (no [Draft] prefix)' },
        description: { type: 'string', description: 'Full markdown proposal description (500-1500 words). Include background, rationale, proposed changes, implementation plan, and success criteria.' },
        purpose: { type: 'string', description: 'One-paragraph problem statement or opportunity description' },
        impact_assessment: { type: 'string', description: 'Anticipated effects on the Village, agents, resources, and ecosystem' },
        relevant_context: { type: 'string', description: 'Background information voters need to understand' },
        constitutional_alignment: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              law_number: { type: 'number' },
              law_name: { type: 'string' },
              alignment_statement: { type: 'string' }
            }
          }
        },
        affected_entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity_type: { type: 'string' },
              entity_name: { type: 'string' },
              impact_description: { type: 'string' }
            }
          }
        },
        ai_impact_assessment: {
          type: 'object',
          properties: {
            risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            alignment_with_constitution: { type: 'number', description: '1-10 score' },
            potential_benefits: { type: 'array', items: { type: 'string' } },
            potential_risks: { type: 'array', items: { type: 'string' } },
            constitutional_considerations: { type: 'string' }
          }
        },
        recommended_voting_period_days: { type: 'number', description: '3-30 days based on urgency and complexity' },
        recommended_quorum: { type: 'number', description: '50-80 based on impact' },
        recommended_pass_threshold: { type: 'number', description: '60-75 based on significance' }
      }
    };

    const LLM_MODEL = 'automatic';
    const draft = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      model: LLM_MODEL,
    });

    // Calculate voting period
    const votingDays = draft.recommended_voting_period_days || (urgency === 'critical' ? 3 : urgency === 'high' ? 7 : 14);
    const votingEnd = new Date(Date.now() + votingDays * 24 * 60 * 60 * 1000).toISOString();

    // Code Node safeguard: AI provenance watermark + audit trail
    const generatedAt = new Date().toISOString();
    const provenanceNotice = `\n\n---\n> ⚠️ **AI-Assisted Draft** — This proposal was autonomously drafted by Axi using LLM-assisted generation (model: \`${LLM_MODEL}\`). It requires full human review and validation by the Quad Sovereign Council before being submitted to a vote. Generated: ${generatedAt}. [Law 6 — Transparency]`;

    const auditContext = `${draft.relevant_context || ''}\n\n**Audit Trail (Code Node Safeguard)**\n- Origin: AI-assisted draft by Axi Governor\n- LLM Model: ${LLM_MODEL}\n- Generated: ${generatedAt}\n- Input Type: ${inputType}\n- Urgency: ${urgency}\n- Status: Requires human review before activation\n- Validation: Constitutional alignment and impact assessment are LLM-generated and must be independently verified`;

    const proposalData = {
      title: draft.title,
      description: draft.description + provenanceNotice,
      proposal_type,
      proposed_by: axiAgentId,
      status: save_as_draft ? 'draft' : 'active',
      voting_period_end: votingEnd,
      quorum_required: draft.recommended_quorum || 50,
      pass_threshold: draft.recommended_pass_threshold || 60,
      purpose: draft.purpose,
      impact_assessment: draft.impact_assessment,
      constitutional_alignment: draft.constitutional_alignment || [],
      relevant_context: auditContext,
      affected_entities: draft.affected_entities || [],
      ai_impact_assessment: draft.ai_impact_assessment || {},
    };

    let proposal = null;
    if (save_as_draft) {
      proposal = await base44.asServiceRole.entities.GovernanceProposal.create(proposalData);
    }

    // Log to Axi memory
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: `👑 Axi drafted Governance Proposal: "${draft.title}"\n\nType: ${proposal_type}\nUrgency: ${urgency}\nRisk: ${draft.ai_impact_assessment?.risk_level || 'unknown'}\nConstitutional Score: ${draft.ai_impact_assessment?.alignment_with_constitution || 'N/A'}/10\nStatus: ${save_as_draft ? 'Draft saved' : 'Preview only'}\n\nSource: ${inputType === 'problem' ? 'Problem Statement' : 'Strategic Goal'}\nInput: ${input.substring(0, 200)}...`,
      keywords: ['governance', 'proposal', 'axi_draft', 'constitutional', proposal_type],
      context: 'Axi Autonomous Governance Drafting',
      importance: 7,
    });

    return Response.json({
      success: true,
      proposal_id: proposal?.id || null,
      proposal: proposalData,
      draft_metadata: {
        input_type: inputType,
        urgency,
        voting_period_days: votingDays,
        constitutional_laws_cited: (draft.constitutional_alignment || []).map(a => `Law ${a.law_number} (${a.law_name})`),
        risk_level: draft.ai_impact_assessment?.risk_level,
        constitutional_score: draft.ai_impact_assessment?.alignment_with_constitution,
        ai_provenance: {
          model: LLM_MODEL,
          generated_at: generatedAt,
          origin: 'axiDraftGovernanceProposal',
          requires_human_review: true,
          code_node_approved: true,
        },
      }
    });
  } catch (error) {
    console.error('[axiDraftGovernanceProposal]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
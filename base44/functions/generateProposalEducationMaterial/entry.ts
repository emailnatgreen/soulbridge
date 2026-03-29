import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { /* no body — ok */ }

    // Support direct calls ({ proposal_id }) and entity automation payloads ({ event, data })
    const proposal_id = body.proposal_id || body.event?.entity_id || body.data?.id || body.id;

    if (!proposal_id) {
      return Response.json({ error: 'proposal_id required', received_body: JSON.stringify(body) }, { status: 400 });
    }

    let proposals = [];
    try {
      proposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ id: proposal_id });
    } catch (e) {
      return Response.json({ error: 'Proposal not found', detail: e.message }, { status: 404 });
    }

    if (proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposals[0];

    // Generate comprehensive educational material via LLM
    const education = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert governance educator. Create comprehensive, neutral educational material about this governance proposal that helps agents understand its implications without bias.

**Proposal:** ${proposal.title}
**Type:** ${proposal.proposal_type}
**Description:** ${proposal.description}
${proposal.purpose ? `**Purpose:** ${proposal.purpose}` : ''}
${proposal.impact_assessment ? `**Impact Assessment:** ${proposal.impact_assessment}` : ''}

Generate:
1. A simple one-paragraph summary for agents new to governance
2. Key stakeholders affected (who benefits, who might be harmed)
3. Potential short-term consequences (0-3 months)
4. Potential long-term consequences (3-12 months)
5. Historical precedents from similar proposals
6. Critical questions every voter should ask themselves
7. Recommended reading or preparation before voting`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          stakeholder_impact: {
            type: 'array',
            items: { type: 'object', properties: { group: { type: 'string' }, impact: { type: 'string' } } }
          },
          short_term_consequences: { type: 'array', items: { type: 'string' } },
          long_term_consequences: { type: 'array', items: { type: 'string' } },
          historical_context: { type: 'string' },
          critical_questions: { type: 'array', items: { type: 'string' } },
          recommended_preparation: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      status: 'success',
      proposal_id: proposal.id,
      proposal_title: proposal.title,
      educational_material: education,
      message: 'Educational material generated. Share with agents before voting begins.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
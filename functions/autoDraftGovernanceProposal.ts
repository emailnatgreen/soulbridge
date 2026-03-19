import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { signal_id, alert_summary, governance_focus } = payload;

    if (!signal_id) {
      return Response.json({ error: 'signal_id required' }, { status: 400 });
    }

    // Fetch the Signal (AI Intel alert)
    const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
    if (!signals.length) {
      return Response.json({ error: 'Signal not found' }, { status: 404 });
    }

    const signal = signals[0];
    const metadata = signal.metadata || {};

    // Create draft GovernanceProposal
    const proposal = await base44.asServiceRole.entities.GovernanceProposal.create({
      title: `[Draft] Governance Review: ${alert_summary || signal.page_name || 'AI Intel Alert'}`,
      description: `
**Source Alert:** ${signal.page_name || 'AI Intelligence System'}
**Timestamp:** ${signal.timestamp}

**Key Findings:**
${metadata.findings || 'Alert received from AI intelligence system'}

**Implications:**
${metadata.implications || 'Requires governance review and Council input'}

**Recommended Initial Actions:**
${Array.isArray(metadata.recommended_actions) ? metadata.recommended_actions.map(a => `- ${a}`).join('\n') : '- Review and assess impact\n- Determine Council notification requirements'}

**Related Signal ID:** ${signal_id}
      `,
      proposal_type: governance_focus || 'general',
      proposed_by: 'axi_intelligence_system',
      status: 'draft',
      voting_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days default
      quorum_required: 50,
      pass_threshold: 60
    });

    return Response.json({
      success: true,
      proposal_id: proposal.id,
      signal_id,
      status: 'draft',
      title: proposal.title
    });
  } catch (error) {
    console.error('autoDraftGovernanceProposal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
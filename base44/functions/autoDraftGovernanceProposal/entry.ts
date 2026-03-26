import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Entity automation payload: { event, data, old_data }
    // Direct invocation payload: { signal_id, alert_summary, governance_focus }
    const signal_id = payload.signal_id || payload.event?.entity_id || payload.data?.id;
    const { alert_summary, governance_focus } = payload;

    // Use entity data directly if provided, otherwise build a minimal signal object
    const signal = payload.data || {
      id: signal_id || 'unknown',
      page_name: 'AI Intelligence Alert',
      timestamp: new Date().toISOString(),
      metadata: { findings: 'Signal processing alert', implications: 'Requires governance review' }
    };
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
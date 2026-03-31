import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { signal_id, findings, implications, recommended_actions } = payload;

    if (!signal_id) {
      return Response.json({ error: 'signal_id required' }, { status: 400 });
    }

    // Fetch the Signal (AI Intel alert)
    const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
    if (!signals.length) {
      return Response.json({ error: 'Signal not found' }, { status: 404 });
    }

    const signal = signals[0];

    // Enrich metadata with structured intelligence
    const enrichedMetadata = {
      ...signal.metadata,
      findings: findings || 'AI ecosystem developments detected',
      implications: implications || 'Potential governance implications',
      recommended_actions: recommended_actions || [
        'Review for governance impact',
        'Assess alignment with constitutional principles',
        'Determine if Council notification needed'
      ],
      enriched_at: new Date().toISOString(),
      enriched_by: 'axi_intelligence_system'
    };

    // Update Signal with enriched metadata
    await base44.asServiceRole.entities.Signal.update(signal_id, {
      metadata: enrichedMetadata
    });

    return Response.json({
      success: true,
      signal_id,
      metadata: enrichedMetadata
    });
  } catch (error) {
    console.error('enrichAIIntelAlert error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cultural Anchor Gate Check
 *
 * Call this before any cultural data proceeds to the first filter agent.
 * Payload: { cultural_anchor_id, data_record_id, pipeline_stage }
 *
 * Returns:
 *   { allowed: true }  — anchor approved, data may proceed
 *   { allowed: false, reason, status } — gate blocked, data stays in pending queue
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { cultural_anchor_id, data_record_id, pipeline_stage } = body;

    if (!cultural_anchor_id) {
      return Response.json({
        allowed: false,
        reason: 'No CulturalAnchor ID provided. Data cannot proceed without a linked anchor.',
        status: 'blocked_no_anchor',
      }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);

    // Fetch the CulturalAnchor record
    const anchors = await base44.asServiceRole.entities.CulturalAnchor.filter({ id: cultural_anchor_id });

    if (!anchors.length) {
      return Response.json({
        allowed: false,
        reason: `CulturalAnchor record ${cultural_anchor_id} not found.`,
        status: 'blocked_anchor_not_found',
      }, { status: 200 });
    }

    const anchor = anchors[0];

    if (anchor.approval_status === 'approved') {
      return Response.json({
        allowed: true,
        anchor_id: anchor.id,
        community_name: anchor.community_name,
        representative_names: anchor.representative_names,
        pipeline_stage: pipeline_stage || 'unspecified',
      });
    }

    if (anchor.approval_status === 'vetoed') {
      return Response.json({
        allowed: false,
        reason: `Cultural Anchor "${anchor.community_name}" has vetoed this data. Processing permanently blocked.`,
        status: 'blocked_vetoed',
        anchor_id: anchor.id,
        community_name: anchor.community_name,
      });
    }

    // Default: pending — stays in queue
    return Response.json({
      allowed: false,
      reason: `Cultural Anchor "${anchor.community_name}" approval is still pending. Data held in queue until representative(s) approve.`,
      status: 'blocked_pending',
      anchor_id: anchor.id,
      community_name: anchor.community_name,
      representative_names: anchor.representative_names,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
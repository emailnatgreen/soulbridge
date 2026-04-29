/**
 * notifyChromeSkillCreated — Entity automation handler
 * Fires when a Widget entity is created.
 * If it's a Chrome Skill, notifies the creator and logs an admin alert.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { event, data } = body;

    if (!data || !event) {
      return Response.json({ skipped: true, reason: 'no data or event' });
    }

    // Only process Chrome Skills (widgets with chrome_skill_instructions)
    const hasSkills = Array.isArray(data.chrome_skill_instructions) && data.chrome_skill_instructions.length > 0;
    if (!hasSkills) {
      return Response.json({ skipped: true, reason: 'not a chrome skill widget' });
    }

    const creatorEmail = data.minted_by || data.creator_id || data.created_by;
    const skillCount = data.chrome_skill_instructions.length;
    const hasManifest = !!data.webmcp_manifest;
    const nftName = data.name || 'Unnamed Chrome Skill';
    const nftId = data.nft_id || event.entity_id;

    // 1. Create in-app notification for the creator
    try {
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_email: creatorEmail,
        type: 'system',
        title: `Chrome Skill NFT Created: ${nftName}`,
        message: `Your Chrome Skill NFT "${nftName}" (${nftId}) has been created as a draft with ${skillCount} skill definition${skillCount !== 1 ? 's' : ''}. ${hasManifest ? 'WebMCP manifest is ready for Chrome upload.' : 'Add a WebMCP manifest to enable Chrome discovery.'}`,
        priority: 'medium',
        status: 'unread',
        action_url: `/widget-marketplace/${event.entity_id}`,
        metadata: {
          widget_id: event.entity_id,
          nft_id: nftId,
          skill_count: skillCount,
          has_manifest: hasManifest,
          event_type: 'chrome_skill_created',
        },
      });
    } catch (e) {
      console.error('[notifyChromeSkillCreated] notification creation failed:', e.message);
    }

    // 2. Send email confirmation to creator
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: creatorEmail,
        subject: `Chrome Skill NFT Created: ${nftName}`,
        body: `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #10b981; margin: 0;">Chrome Skill NFT Created</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 8px;">${nftName}</p>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 4px 0; font-size: 13px;"><strong>NFT ID:</strong> ${nftId}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Skills:</strong> ${skillCount} definition${skillCount !== 1 ? 's' : ''}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>WebMCP:</strong> ${hasManifest ? '✅ Ready' : '⚠️ Not yet generated'}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> Draft — ready for mint preparation</p>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 3px solid #10b981;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;"><strong>Next Steps:</strong></p>
              <ol style="margin: 8px 0; padding-left: 20px; font-size: 12px; color: #94a3b8;">
                <li>Review your skill instructions in the NFT Workshop</li>
                <li>Download the WebMCP manifest JSON</li>
                <li>Prepare and mint on XRPL mainnet</li>
                <li>Host the manifest alongside your NFT metadata</li>
              </ol>
            </div>
            <p style="font-size: 11px; color: #475569; text-align: center;">SoulBridge Village · Agent-Native NFT Platform</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[notifyChromeSkillCreated] email failed:', e.message);
    }

    return Response.json({
      success: true,
      notified: creatorEmail,
      nft_name: nftName,
      skill_count: skillCount,
    });

  } catch (error) {
    console.error('[notifyChromeSkillCreated] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
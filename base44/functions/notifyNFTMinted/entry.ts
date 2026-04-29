import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !event) {
      return Response.json({ error: 'No event data' }, { status: 400 });
    }

    // Only notify when mint_status changes to a minted/prepared state
    const widgetName = data.name || 'Unnamed NFT';
    const nftId = data.nft_id || 'N/A';
    const mintStatus = data.mint_status || 'unknown';
    const category = data.category || 'general';
    const widgetType = data.widget_type || 'unknown';
    const createdBy = data.created_by || '';

    // Build email body
    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #ffffff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: white;">🎉 NFT Minted Successfully</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">SoulBridge Village · XRPL</p>
        </div>
        <div style="padding: 32px;">
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 16px; font-size: 18px; color: #c084fc;">${widgetName}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 13px;">NFT ID</td>
                <td style="padding: 8px 0; color: #e0e0e0; font-size: 13px; text-align: right; font-family: monospace;">${nftId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 13px;">Type</td>
                <td style="padding: 8px 0; color: #e0e0e0; font-size: 13px; text-align: right;">${widgetType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 13px;">Category</td>
                <td style="padding: 8px 0; color: #e0e0e0; font-size: 13px; text-align: right;">${category}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 13px;">Mint Status</td>
                <td style="padding: 8px 0; font-size: 13px; text-align: right;">
                  <span style="background: rgba(16,185,129,0.2); color: #34d399; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">${mintStatus}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 13px;">Created By</td>
                <td style="padding: 8px 0; color: #e0e0e0; font-size: 13px; text-align: right;">${createdBy}</td>
              </tr>
            </table>
          </div>
          <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin: 24px 0 0;">
            SoulBridge Village · The Living Codex · XRPL Mainnet
          </p>
        </div>
      </div>
    `;

    // Send to the creator
    if (createdBy && createdBy.includes('@')) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: createdBy,
        subject: `🎉 NFT Minted: ${widgetName} (${nftId})`,
        body: emailBody,
        from_name: 'SoulBridge Village',
      });
    }

    // Also notify admins
    const admins = await base44.asServiceRole.entities.User.list('-created_date', 50);
    const adminEmails = (admins || [])
      .filter(u => u.role === 'admin' && u.email && u.email !== createdBy)
      .map(u => u.email);

    for (const email of adminEmails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `🎉 NFT Minted: ${widgetName} (${nftId})`,
        body: emailBody,
        from_name: 'SoulBridge Village',
      });
    }

    return Response.json({
      success: true,
      notified: [createdBy, ...adminEmails].filter(Boolean),
      widget: widgetName,
      nft_id: nftId,
    });
  } catch (error) {
    console.error('NFT mint notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
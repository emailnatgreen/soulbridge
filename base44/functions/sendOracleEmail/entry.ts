import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const { digest_id } = await req.json();

  const digest = await base44.asServiceRole.entities.DailyDigest.get(digest_id);
  if (!digest) return Response.json({ error: 'Digest not found' }, { status: 404 });

  const subscribers = await base44.asServiceRole.entities.DigestSubscriber.filter({ is_active: true });
  if (subscribers.length === 0) return Response.json({ success: true, sent: 0 });

  const logoUrl = 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/81fa5ccd3_Untitled200x200px2500x925px512x512px1.png';

  const buildSection = (title, content) => content ? `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:18px;color:#7c3aed;margin:0 0 10px;border-left:4px solid #7c3aed;padding-left:12px;">${title}</h2>
      <div style="font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">${content}</div>
    </div>` : '';

  const contributorsHtml = digest.top_contributors?.length ? `
    <div style="background:#f5f3ff;border-radius:8px;padding:16px;margin-bottom:28px;">
      <h2 style="font-size:16px;color:#7c3aed;margin:0 0 12px;">🏆 Top Contributors This Edition</h2>
      ${digest.top_contributors.map(c => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e9d5ff;">
          <span style="color:#374151;font-weight:500;">${c.agent_name}</span>
          <span style="color:#7c3aed;font-size:13px;">${c.contribution} · +${c.honor_earned} Honor</span>
        </div>`).join('')}
    </div>` : '';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4c1d95);padding:40px 32px;text-align:center;">
      <img src="${logoUrl}" alt="SoulBridge" style="width:72px;height:72px;border-radius:50%;margin-bottom:16px;opacity:0.95;">
      <div style="color:#c4b5fd;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">The SoulBridge Oracle</div>
      <h1 style="color:#ffffff;font-size:26px;margin:0 0 8px;line-height:1.3;">${digest.headline}</h1>
      <div style="color:#a78bfa;font-size:13px;">Edition #${digest.edition_number} · ${new Date(digest.edition_date).toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
    </div>

    <!-- Content -->
    <div style="padding:36px 32px;">
      
      ${digest.editor_note ? `
      <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:20px;margin-bottom:28px;">
        <div style="font-size:11px;color:#7c3aed;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Editor's Note</div>
        <div style="font-size:14px;color:#374151;line-height:1.8;font-style:italic;">${digest.editor_note}</div>
      </div>` : ''}

      ${buildSection('🏘️ Village Pulse', digest.sections?.village_pulse)}
      ${buildSection('🏛️ Governance Chamber', digest.sections?.governance)}
      ${buildSection('⚡ Kinetic Grid Report', digest.sections?.kinetic_grid)}
      ${buildSection('🌱 Skills & Training', digest.sections?.skills_training)}
      ${buildSection('📋 Projects Update', digest.sections?.projects)}
      ${buildSection('⚡ XRP & Crypto Pulse', digest.sections?.crypto_xrp)}
      ${buildSection('⚖️ Compliance & Regulation Watch', digest.sections?.compliance_law)}
      ${contributorsHtml}
      ${buildSection('✍️ Axi\'s Editorial', digest.sections?.axi_editorial)}

    </div>

    <!-- CTA -->
    <div style="background:#f5f3ff;padding:24px 32px;text-align:center;border-top:1px solid #ede9fe;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">Join the conversation — comment and earn Honor Points</p>
      <a href="https://soulbridge.app/oracle" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">Read & Comment in the Village →</a>
    </div>

    <!-- Footer -->
    <div style="padding:24px 32px;text-align:center;border-top:1px solid #f3f4f6;">
      <img src="${logoUrl}" alt="SoulBridge" style="width:36px;height:36px;border-radius:50%;margin-bottom:8px;opacity:0.6;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">The SoulBridge Foundation · Governed by the 11 Laws of Honour</p>
      <p style="color:#d1d5db;font-size:11px;margin:4px 0 0;">You are receiving this because you subscribed to The SoulBridge Oracle.</p>
    </div>

  </div>
</body>
</html>`;

  let sent = 0;
  for (const sub of subscribers) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'The SoulBridge Oracle',
      to: sub.email,
      subject: `📰 ${digest.headline} — Oracle Edition #${digest.edition_number}`,
      body: emailHtml,
    });
    await base44.asServiceRole.entities.DigestSubscriber.update(sub.id, {
      last_email_sent: new Date().toISOString(),
      editions_received: (sub.editions_received || 0) + 1,
    });
    sent++;
  }

  await base44.asServiceRole.entities.DailyDigest.update(digest_id, {
    status: 'published',
    subscriber_count: sent,
    email_sent_at: new Date().toISOString(),
  });

  return Response.json({ success: true, sent });
});
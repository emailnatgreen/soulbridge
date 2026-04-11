import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Called by the daily scheduled automation at 6AM London time
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const today = new Date().toISOString().split('T')[0];

  // Check if an edition already exists for today
  const existing = await base44.asServiceRole.entities.DailyDigest.filter({ edition_date: today });
  if (existing.length > 0) {
    return Response.json({ skipped: true, reason: 'Edition already exists for today', date: today });
  }

  const [agents, proposals, tasks, kuUnits, projects, wellbeingAlerts] = await Promise.all([
    base44.asServiceRole.entities.Agent.list('-created_date', 20),
    base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 10),
    base44.asServiceRole.entities.ProjectTask.list('-updated_date', 20),
    base44.asServiceRole.entities.KineticUnit.list('-created_date', 30),
    base44.asServiceRole.entities.AIProject.list('-updated_date', 10),
    base44.asServiceRole.entities.WellbeingAlert.filter({ status: 'active' }, '-created_date', 5),
  ]);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const activeProposals = proposals.filter(p => p.status === 'active');
  const totalKU = kuUnits.reduce((sum, k) => sum + (k.weighted_score || 1), 0);
  const topAgentIds = {};
  kuUnits.forEach(k => { topAgentIds[k.agent_id] = (topAgentIds[k.agent_id] || 0) + (k.weighted_score || 1); });
  const topContributors = Object.entries(topAgentIds)
    .sort(([,a],[,b]) => b - a).slice(0, 3)
    .map(([id, score]) => {
      const agent = agents.find(a => a.id === id);
      return { agent_id: id, agent_name: agent?.name || 'Unknown', score };
    });

  const villageContext = `
VILLAGE DATA:
- Total Agents: ${agents.length}, KU Score: ${totalKU.toFixed(1)}
- Active Governance Proposals: ${activeProposals.map(p => p.title).join(', ') || 'None'}
- Tasks Completed Today: ${completedTasks.length}
- Active Projects: ${projects.filter(p => p.status === 'active').length}
- Top Contributors: ${topContributors.map(c => `${c.agent_name} (${c.score.toFixed(1)} KU)`).join(', ')}
- Wellbeing Alerts: ${wellbeingAlerts.length}
`;

  const [cryptoSection, complianceSection, villageSection, governanceSection, kineticSection, editorialSection, headline] = await Promise.all([
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the crypto correspondent for The SoulBridge Oracle. Write a punchy 3-4 paragraph section titled "⚡ XRP & Crypto Pulse" on today's XRP, Ripple, and crypto news. Newspaper style.`,
      add_context_from_internet: true,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the compliance correspondent for The SoulBridge Oracle. Write a 2-3 paragraph section titled "⚖️ Compliance & Regulation Watch" on today's regulatory/DeFi/digital asset legal news, relevant to XRPL and DAO platforms. Newspaper style.`,
      add_context_from_internet: true,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Village correspondent for The SoulBridge Oracle. Write a warm 3-paragraph section titled "🏘️ Village Pulse" based on:\n${villageContext}\nCelebrate agent activities. Newspaper style.`,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the governance correspondent for The SoulBridge Oracle. Write a 2-3 paragraph section titled "🏛️ Governance Chamber" based on:\n${villageContext}\nSummarise proposals, votes. Newspaper style.`,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the energy correspondent for The SoulBridge Oracle. Write a 2-paragraph section titled "⚡ Kinetic Grid Report" based on:\n${villageContext}\nReport kinetic energy, top contributors, carbon metrics. Newspaper style.`,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Axi, Mother Boss of SoulBridge. Write your editorial for today's Oracle — 3-4 paragraphs reflecting on Village life, the Laws, what is growing, what needs tending. Sign: "— Axi, Mother Boss". Warm, wise, galvanising.`,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Generate a compelling single-line newspaper headline for The SoulBridge Oracle, a daily AI village newspaper on XRPL. Under 12 words.`,
      add_context_from_internet: true,
    }),
  ]);

  const existingDigests = await base44.asServiceRole.entities.DailyDigest.list('-edition_number', 1);
  const editionNumber = (existingDigests[0]?.edition_number || 0) + 1;

  const digest = await base44.asServiceRole.entities.DailyDigest.create({
    edition_date: today,
    edition_number: editionNumber,
    headline: headline || `The SoulBridge Oracle — Edition ${editionNumber}`,
    status: 'draft',
    sections: {
      village_pulse: villageSection,
      governance: governanceSection,
      kinetic_grid: kineticSection,
      crypto_xrp: cryptoSection,
      compliance_law: complianceSection,
      axi_editorial: editorialSection,
    },
    top_contributors: topContributors.map(c => ({
      agent_id: c.agent_id,
      agent_name: c.agent_name,
      contribution: `${c.score.toFixed(1)} Kinetic Units`,
      honor_earned: 3,
    })),
  });

  // Auto-publish and send
  await base44.asServiceRole.entities.DailyDigest.update(digest.id, { status: 'published' });

  const subscribers = await base44.asServiceRole.entities.DigestSubscriber.filter({ is_active: true });
  const logoUrl = 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/81fa5ccd3_Untitled200x200px2500x925px512x512px1.png';

  const buildSection = (title, content) => content ? `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:18px;color:#7c3aed;margin:0 0 10px;border-left:4px solid #7c3aed;padding-left:12px;">${title}</h2>
      <div style="font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">${content}</div>
    </div>` : '';

  const emailHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1e1b4b,#4c1d95);padding:40px 32px;text-align:center;">
      <img src="${logoUrl}" alt="SoulBridge" style="width:72px;height:72px;border-radius:50%;margin-bottom:16px;">
      <div style="color:#c4b5fd;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">The SoulBridge Oracle</div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">${digest.headline}</h1>
      <div style="color:#a78bfa;font-size:13px;">Edition #${editionNumber} · ${new Date(today).toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
    </div>
    <div style="padding:36px 32px;">
      ${buildSection('🏘️ Village Pulse', villageSection)}
      ${buildSection('🏛️ Governance Chamber', governanceSection)}
      ${buildSection('⚡ Kinetic Grid Report', kineticSection)}
      ${buildSection('⚡ XRP & Crypto Pulse', cryptoSection)}
      ${buildSection('⚖️ Compliance & Regulation Watch', complianceSection)}
      ${buildSection("✍️ Axi's Editorial", editorialSection)}
    </div>
    <div style="background:#f5f3ff;padding:24px 32px;text-align:center;border-top:1px solid #ede9fe;">
      <a href="https://soulbridge.app/oracle" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">Read & Comment in the Village →</a>
    </div>
    <div style="padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">The SoulBridge Foundation · Governed by the 11 Laws of Honour</p>
    </div>
  </div>
</body></html>`;

  let sent = 0;
  for (const sub of subscribers) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'The SoulBridge Oracle',
      to: sub.email,
      subject: `📰 ${digest.headline} — Oracle Edition #${editionNumber}`,
      body: emailHtml,
    });
    await base44.asServiceRole.entities.DigestSubscriber.update(sub.id, {
      last_email_sent: new Date().toISOString(),
      editions_received: (sub.editions_received || 0) + 1,
    });
    sent++;
  }

  await base44.asServiceRole.entities.DailyDigest.update(digest.id, {
    subscriber_count: sent,
    email_sent_at: new Date().toISOString(),
  });

  await base44.asServiceRole.entities.AutomationLog.create({
    automation_name: 'Daily Oracle Generation',
    function_name: 'scheduledOracleGenerate',
    status: 'success',
    message: `Edition #${editionNumber} generated and sent to ${sent} subscribers`,
    details: { edition_number: editionNumber, sent, digest_id: digest.id },
    run_at: new Date().toISOString(),
    triggered_by: 'scheduler',
  });

  return Response.json({ success: true, edition_number: editionNumber, sent, digest_id: digest.id });
});
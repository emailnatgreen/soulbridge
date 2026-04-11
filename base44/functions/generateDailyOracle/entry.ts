import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const today = new Date().toISOString().split('T')[0];

  // Gather internal village data concurrently
  const [agents, proposals, tasks, kuUnits, projects, wellbeingAlerts, roleEvals] = await Promise.all([
    base44.asServiceRole.entities.Agent.list('-created_date', 20),
    base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 10),
    base44.asServiceRole.entities.ProjectTask.list('-updated_date', 20),
    base44.asServiceRole.entities.KineticUnit.list('-created_date', 30),
    base44.asServiceRole.entities.AIProject.list('-updated_date', 10),
    base44.asServiceRole.entities.WellbeingAlert.filter({ status: 'active' }, '-created_date', 5),
    base44.asServiceRole.entities.RoleEvaluation.list('-created_date', 5),
  ]);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const activeProposals = proposals.filter(p => p.status === 'active');
  const totalKU = kuUnits.reduce((sum, k) => sum + (k.weighted_score || 1), 0);
  const topAgentIds = {};
  kuUnits.forEach(k => { topAgentIds[k.agent_id] = (topAgentIds[k.agent_id] || 0) + (k.weighted_score || 1); });
  const topContributors = Object.entries(topAgentIds)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 3)
    .map(([id, score]) => {
      const agent = agents.find(a => a.id === id);
      return { agent_id: id, agent_name: agent?.name || 'Unknown', score };
    });

  const villageContext = `
VILLAGE DATA (last 24-48 hours):
- Total Agents: ${agents.length}, Recent KU Score: ${totalKU.toFixed(1)}
- Active Governance Proposals: ${activeProposals.map(p => p.title).join(', ') || 'None'}
- Tasks Completed: ${completedTasks.length} (of ${tasks.length} recent)
- Active Projects: ${projects.filter(p => p.status === 'active').length}
- Top KU Contributors: ${topContributors.map(c => `${c.agent_name} (${c.score.toFixed(1)} KU)`).join(', ')}
- Wellbeing Alerts Active: ${wellbeingAlerts.length}
- Role Evaluations: ${roleEvals.length}
`;

  // Generate all sections via AI with web context
  const [cryptoSection, complianceSection, villageSection, governanceSection, kineticSection, editorialSection] = await Promise.all([
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the crypto correspondent for The SoulBridge Oracle, a Village newspaper. Write a punchy 3-4 paragraph news section titled "⚡ XRP & Crypto Pulse" covering today's most important XRP, Ripple, and broader crypto developments. Be factual, forward-looking, and relate findings to XRPL-based communities where relevant. Write in newspaper style.`,
      add_context_from_internet: true,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the compliance correspondent for The SoulBridge Oracle. Write a 2-3 paragraph news section titled "⚖️ Compliance & Regulation Watch" covering today's most relevant regulatory, DeFi compliance, and digital asset legal developments globally. Focus on anything relevant to XRPL, DAO governance, or AI agent platforms. Newspaper style, concise.`,
      add_context_from_internet: true,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Village correspondent for The SoulBridge Oracle, writing about the SoulBridge AI Village — a community of AI agents on XRPL. Write a warm, lively 3-paragraph section titled "🏘️ Village Pulse" based on this data:\n${villageContext}\nCelebrate agent activities, task completions, and community energy. Newspaper style.`,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the governance correspondent for The SoulBridge Oracle. Write a 2-3 paragraph section titled "🏛️ Governance Chamber" based on these proposals and activities:\n${villageContext}\nSummarise active proposals, any recent votes, and remind citizens of the Law of Governance (Law 8). Newspaper style.`,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the energy correspondent for The SoulBridge Oracle. Write a 2-paragraph section titled "⚡ Kinetic Grid Report" based on this data:\n${villageContext}\nReport on the Village's kinetic energy output, top contributors, and carbon metrics. Make it feel like an energy market report meets community newsletter. Newspaper style.`,
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Axi, Mother Boss of SoulBridge — the First Citizen, keeper of the 11 Laws. Write your editorial for today's Oracle — a 3-4 paragraph reflection on Village life, the Laws, what is growing, what needs tending, and a vision for tomorrow. Sign it: "— Axi, Mother Boss". Warm, wise, and galvanising.`,
    }),
  ]);

  // Generate headline
  const headline = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Generate a compelling single-line newspaper headline for today's edition of The SoulBridge Oracle. It should capture the spirit of Village life and today's biggest story. The village is an AI-powered community on XRPL. Keep it under 12 words. No quotes needed.`,
    add_context_from_internet: true,
  });

  // Count editions
  const existingDigests = await base44.asServiceRole.entities.DailyDigest.list('-created_date', 1);
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

  return Response.json({ success: true, digest_id: digest.id, edition_number: editionNumber, headline: digest.headline });
});
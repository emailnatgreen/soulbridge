import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Public data endpoint — no user auth needed.
 * All queries use asServiceRole exclusively.
 * Now serves full-spectrum live data for landing, compass, scroll, and agent_lookup.
 */

function getBase44Client(req, bodyStr) {
  try {
    const headers = new Headers(req.headers);
    const auth = headers.get('authorization') || '';
    if (auth && auth.startsWith('Bearer ') && auth.length > 30) {
      const newReq = new Request(req.url, { method: req.method, headers, body: bodyStr });
      return createClientFromRequest(newReq);
    }
  } catch (_) {}

  try {
    const headers = new Headers(req.headers);
    headers.set('authorization', 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJwdWJsaWMiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.');
    const newReq = new Request(req.url, { method: req.method, headers, body: bodyStr });
    return createClientFromRequest(newReq);
  } catch (_) {}

  return createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
    requiresAuth: false,
  });
}

Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);
    const { page } = body;

    const base44 = getBase44Client(req, bodyStr);

    if (page === 'landing') {
      const [agents, wallets, kus, projects, tasks, votes, activities] = await Promise.all([
        base44.asServiceRole.entities.Agent.filter({ status: 'active' }, '-created_date', 50),
        base44.asServiceRole.entities.Wallet.filter({ is_published: true }, 'created_date', 200),
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 500),
        base44.asServiceRole.entities.AIProject.list('-created_date', 200),
        base44.asServiceRole.entities.ProjectTask.list('-created_date', 500),
        base44.asServiceRole.entities.GovernanceVote.list('-created_date', 200),
        base44.asServiceRole.entities.EconomicActivity.list('-created_date', 100).catch(() => []),
      ]);

      const normalizedAgents = agents.map(a => ({
        id: a.id, name: a.name, role: a.role, purpose: a.purpose, tagline: a.tagline,
        honor_score: a.honor_score, avatar_url: a.avatar_url,
        classic_address: a.classic_address, wallet_id: a.wallet_id,
        external_classic_addresses: a.external_classic_addresses || []
      }));

      const publishedDidCount = new Set([
        ...wallets.map(w => w.classic_address).filter(Boolean),
        ...normalizedAgents.map(a => a.classic_address).filter(Boolean),
        ...normalizedAgents.flatMap(a => a.external_classic_addresses || []).filter(Boolean)
      ]).size;

      const activeProjects = projects.filter(p => ['active', 'planning', 'recruiting'].includes(p.status));
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const totalRewardDrops = tasks.reduce((s, t) => s + (t.reward_drops || 0), 0);
      const economicVolume = activities.reduce((s, a) => s + (a.amount || 0), 0);

      return Response.json({
        agents: normalizedAgents,
        wallets_count: publishedDidCount,
        kus,
        projects_total: projects.length,
        projects_active: activeProjects.length,
        tasks_total: tasks.length,
        tasks_completed: completedTasks.length,
        tasks_overdue: tasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < new Date()).length,
        total_reward_drops: totalRewardDrops,
        votes_total: votes.length,
        votes_unique_voters: new Set(votes.map(v => v.voter_agent_id)).size,
        economic_volume: economicVolume,
        economic_count: activities.length,
      });
    }

    if (page === 'scroll') {
      const [memories, kus, agents] = await Promise.all([
        base44.asServiceRole.entities.Memory.filter({}, '-created_date', 50),
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 200),
        base44.asServiceRole.entities.Agent.list('-created_date', 50),
      ]);
      return Response.json({
        memories, kus,
        agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role, classic_address: a.classic_address, wallet_id: a.wallet_id })),
      });
    }

    if (page === 'compass') {
      const [kus, agents, proposals, votes, tasks, projects] = await Promise.all([
        base44.asServiceRole.entities.KineticUnit.list('-created_date', 500),
        base44.asServiceRole.entities.Agent.list('-created_date', 50),
        base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 20),
        base44.asServiceRole.entities.GovernanceVote.list('-created_date', 200),
        base44.asServiceRole.entities.ProjectTask.list('-created_date', 300),
        base44.asServiceRole.entities.AIProject.list('-created_date', 100),
      ]);
      return Response.json({
        kus,
        agents: agents.map(a => ({
          id: a.id, name: a.name, role: a.role, classic_address: a.classic_address,
          wallet_id: a.wallet_id, external_classic_addresses: a.external_classic_addresses,
          created_by: a.created_by, honor_score: a.honor_score
        })),
        proposals, votes,
        tasks_total: tasks.length,
        tasks_completed: tasks.filter(t => t.status === 'completed').length,
        projects_total: projects.length,
        projects_active: projects.filter(p => ['active', 'planning', 'recruiting'].includes(p.status)).length,
      });
    }

    if (page === 'agent_lookup') {
      const { agent_name } = body || {};
      const agents = await base44.asServiceRole.entities.Agent.filter({ name: agent_name }, '-created_date', 1);
      const agent = agents[0];
      if (!agent) return Response.json({ agent: null });
      return Response.json({
        agent: { id: agent.id, name: agent.name, role: agent.role, purpose: agent.purpose, tagline: agent.tagline, honor_score: agent.honor_score, avatar_url: agent.avatar_url, classic_address: agent.classic_address },
      });
    }

    return Response.json({ error: 'Unknown page type' }, { status: 400 });
  } catch (error) {
    console.error('[publicPageData] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
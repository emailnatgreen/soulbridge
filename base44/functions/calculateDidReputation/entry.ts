import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, wallet_id } = await req.json();

    if (!agent_id && !wallet_id) {
      return Response.json({ error: 'agent_id or wallet_id required' }, { status: 400 });
    }

    // Get agent info
    let targetAgent = null;
    if (agent_id) {
      targetAgent = await base44.asServiceRole.entities.Agent.get(agent_id);
    } else if (wallet_id) {
      const agents = await base44.asServiceRole.entities.Agent.filter({ wallet_id });
      targetAgent = agents[0];
    }

    if (!targetAgent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Simple reputation calculation to avoid quota limits
    const honorScore = targetAgent.honor_score || 100;
    const honorMultiplier = honorScore / 100;

    // Role-based bonus
    const roleBonus = {
      'master': 150,
      'elder': 100,
      'guardian': 50,
      'creator': 40,
      'teacher': 35,
      'healer': 35,
      'trader': 30,
      'scout': 25,
      'citizen': 0
    };
    const roleScore = roleBonus[targetAgent.role] || 0;
    const statusBonus = targetAgent.status === 'active' ? 20 : 0;

    const baseScore = roleScore + statusBonus;
    const finalScore = Math.round(baseScore * honorMultiplier);

    // Determine tier
    let tier = 'novice';
    if (finalScore >= 300) tier = 'master';
    else if (finalScore >= 200) tier = 'elder';
    else if (finalScore >= 100) tier = 'guardian';
    else if (finalScore >= 50) tier = 'citizen';

    return Response.json({
      agent_id: targetAgent.id,
      agent_name: targetAgent.name,
      wallet_id: targetAgent.wallet_id,
      total_score: finalScore,
      tier,
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating reputation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all necessary data
    const [activities, agents, wallets] = await Promise.all([
      base44.asServiceRole.entities.EconomicActivity.list('', 10000),
      base44.asServiceRole.entities.Agent.list('', 10000),
      base44.asServiceRole.entities.Wallet.list('', 10000),
    ]);

    let reconciled = 0;
    let unresolved = 0;
    const updates = [];

    // Helper to resolve agent from any ID
    const resolveAgentFromId = (agentId) => {
      return agents.find(a => a.id === agentId) ||
             agents.find(a => a.name === agentId) ||
             agents.find(a => a.classic_address === agentId) ||
             agents.find(a => a.wallet_id === agentId) ||
             agents.find(a => a.external_classic_addresses?.includes(agentId));
    };

    // Helper to resolve agent from wallet
    const resolveAgentFromWallet = (addressId) => {
      const wallet = wallets.find(w => w.classic_address === addressId);
      if (wallet && wallet.owner_id) {
        return agents.find(a => a.id === wallet.owner_id);
      }
      return null;
    };

    // Process each activity
    for (const activity of activities) {
      let resolvedAgent = resolveAgentFromId(activity.agent_id);

      // If not found by ID, try wallet lookup
      if (!resolvedAgent) {
        resolvedAgent = resolveAgentFromWallet(activity.agent_id);
      }

      // If we found an agent, prepare update
      if (resolvedAgent) {
        const activityToUpdate = {
          agent_id: resolvedAgent.id, // Normalize to agent ID
        };

        // Optionally add a reconciliation annotation
        if (activity.agent_id !== resolvedAgent.id) {
          activityToUpdate.reconciliation_note = `Resolved from ${activity.agent_id} to ${resolvedAgent.name}`;
        }

        updates.push({ id: activity.id, data: activityToUpdate });
        reconciled++;
      } else {
        // Could not resolve - flag for review
        unresolved++;
      }
    }

    // Apply all updates in batch
    let successCount = 0;
    let failCount = 0;

    for (const update of updates) {
      try {
        await base44.asServiceRole.entities.EconomicActivity.update(update.id, update.data);
        successCount++;
      } catch (e) {
        failCount++;
      }
    }

    return Response.json({
      status: 'success',
      summary: {
        total_activities: activities.length,
        reconciled,
        unresolved,
        updates_applied: successCount,
        update_failures: failCount,
      },
      message: `Reconciliation complete: ${reconciled} activities resolved, ${unresolved} remain unresolved, ${successCount} updates applied successfully.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
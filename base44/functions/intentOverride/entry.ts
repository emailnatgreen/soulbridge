import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Intent Override Mechanism (Purple Node Veto)
 * Allows Node 6 (Human / Governor) to reverse or veto a pending action
 * proposed by Node 4 (Code) or Node 5 (Axi).
 *
 * POST /intentOverride
 *   body: {
 *     action: "veto" | "approve",
 *     target_entity: "GovernanceProposal" | "Transaction" | "EconomicActivity",
 *     target_id: "<entity_id>",
 *     reason: "string"
 *   }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin (Node 6 / Governor) may invoke this override
    if (user.role !== 'admin') {
      return Response.json({
        error: 'Forbidden: Intent Override is reserved for the Human Node (Governor / admin role).',
        node_required: 6
      }, { status: 403 });
    }

    const body = await req.json();
    const { action, target_entity, target_id, reason } = body;

    if (!action || !target_entity || !target_id) {
      return Response.json({ error: 'action, target_entity, and target_id are required.' }, { status: 400 });
    }

    const entityMap = {
      GovernanceProposal: base44.asServiceRole.entities.GovernanceProposal,
      EconomicActivity: base44.asServiceRole.entities.EconomicActivity,
      Transaction: base44.asServiceRole.entities.Transaction,
    };

    const entity = entityMap[target_entity];
    if (!entity) {
      return Response.json({ error: `Unsupported target_entity: ${target_entity}` }, { status: 400 });
    }

    const updateData = action === 'veto'
      ? { status: 'rejected', execution_result: { vetoed_by: user.email, reason, vetoed_at: new Date().toISOString(), node: 6 } }
      : { status: 'active', execution_result: { approved_by: user.email, reason, approved_at: new Date().toISOString(), node: 6 } };

    await entity.update(target_id, updateData);

    // Log the override action
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Intent Override',
      function_name: 'intentOverride',
      status: 'success',
      message: `Node 6 (${user.email}) ${action === 'veto' ? 'VETOED' : 'APPROVED'} ${target_entity} ${target_id}`,
      details: { action, target_entity, target_id, reason, node: 6 },
      run_at: new Date().toISOString(),
      triggered_by: 'manual'
    });

    return Response.json({
      success: true,
      action,
      target_entity,
      target_id,
      executed_by: user.email,
      node: 6,
      message: action === 'veto'
        ? `Veto executed. ${target_entity} ${target_id} has been reversed by the Human Node.`
        : `Approval granted. ${target_entity} ${target_id} cleared by the Human Node.`
    });

  } catch (error) {
    console.error('intentOverride error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
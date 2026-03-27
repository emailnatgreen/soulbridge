import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Auto-Generate Kinetic Units from Entity Events
 * Triggered by: GovernanceVote.create, ProjectTask.update (completed), Wallet.update (is_published=true)
 * Calls millWheelEngineIngest → generate_ku to mint a KU for the acting agent.
 */

const KU_TYPE_MAP = {
  GovernanceVote: 'governance_vote',
  ProjectTask: 'task_completion',
  Wallet: 'did_publication',
};

// Resolve the agent_id from entity data depending on entity type
function resolveAgentId(entityName, data) {
  if (entityName === 'GovernanceVote') return data.voter_agent_id || data.agent_id;
  if (entityName === 'ProjectTask') return data.assigned_agent_id || data.agent_id;
  if (entityName === 'Wallet') return data.owner_id || data.agent_id;
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;
    if (!event || !data) {
      return Response.json({ status: 'skipped', reason: 'no event or data' });
    }

    const entityName = event.entity_name;
    const kuType = KU_TYPE_MAP[entityName];
    if (!kuType) {
      return Response.json({ status: 'skipped', reason: `no KU type for ${entityName}` });
    }

    const agentId = resolveAgentId(entityName, data);
    if (!agentId) {
      return Response.json({ status: 'skipped', reason: 'could not resolve agent_id from entity data' });
    }

    // Invoke millWheelEngineIngest to generate the KU
    const result = await base44.asServiceRole.functions.invoke('millWheelEngineIngest', {
      action: 'generate_ku',
      ku_type: kuType,
      agent_id: agentId,
      trigger_event: `${entityName}.${event.type}`,
      trigger_entity_id: event.entity_id,
      metadata: {
        auto_generated: true,
        source_entity: entityName,
        event_type: event.type,
      },
    });

    // Log to AutomationLog
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: `AutoKU_${entityName}`,
      function_name: 'autoGenerateKineticUnit',
      status: 'success',
      message: `KU generated: ${kuType} for agent ${agentId}`,
      details: { ku_type: kuType, agent_id: agentId, entity_id: event.entity_id },
      run_at: new Date().toISOString(),
      triggered_by: 'entity_event',
    });

    return Response.json({ status: 'success', ku_type: kuType, agent_id: agentId, result });

  } catch (error) {
    // Best-effort error log
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'AutoKU_Error',
        function_name: 'autoGenerateKineticUnit',
        status: 'error',
        message: error.message,
        error_detail: error.stack || error.message,
        run_at: new Date().toISOString(),
        triggered_by: 'entity_event',
      });
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});
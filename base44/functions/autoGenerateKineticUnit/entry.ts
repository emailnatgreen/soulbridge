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
  MentorshipSession: 'mentorship_session',
  KnowledgeContribution: 'knowledge_contribution',
  AgentSkill: 'skill_development',
  Transaction: 'economic_exchange',
  CollaborativeSession: 'collaborative_action',
  ResourcePurchase: 'resource_trade',
  AgentMessage: 'agent_message',
};

// Resolve the agent_id from entity data depending on entity type.
// NOTE: Wallet.owner_id is a platform User ID, NOT an Agent ID.
// We store it and let kineticGridIntegration skip unknown agent IDs safely,
// OR resolve via Agent lookup below.
async function resolveAgentId(entityName, data, base44) {
  if (entityName === 'GovernanceVote') return data.voter_agent_id || data.agent_id;
  if (entityName === 'ProjectTask') return data.assigned_agent_id || data.agent_id;
  if (entityName === 'MentorshipSession') return data.mentor_agent_id || data.agent_id;
  if (entityName === 'KnowledgeContribution') return data.author_agent_id || data.contributor_agent_id || data.agent_id;
  if (entityName === 'AgentSkill') return data.agent_id;
  if (entityName === 'Transaction') return data.sender_agent_id || data.from_agent_id || data.agent_id;
  if (entityName === 'CollaborativeSession') return data.host_agent_id || data.organizer_agent_id || data.created_by_agent_id || data.agent_id;
  if (entityName === 'ResourcePurchase') return data.buyer_agent_id || data.agent_id;
  if (entityName === 'AgentMessage') return data.sender_agent_id || data.from_agent_id || data.agent_id;
  if (entityName === 'Wallet') {
    const agents = await base44.asServiceRole.entities.Agent.filter({ classic_address: data.classic_address });
    if (agents.length > 0) return agents[0].id;
    const byWalletId = await base44.asServiceRole.entities.Agent.filter({ wallet_id: data.id });
    if (byWalletId.length > 0) return byWalletId[0].id;
    return null;
  }
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

    const agentId = await resolveAgentId(entityName, data, base44);
    if (!agentId) {
      return Response.json({ status: 'skipped', reason: 'could not resolve agent_id from entity data' });
    }

    // Idempotency guard — prevent duplicate KUs for the same trigger entity event
    if (event.entity_id) {
      const existing = await base44.asServiceRole.entities.KineticUnit.filter({
        trigger_entity_id: event.entity_id,
        ku_type: kuType,
      }, '-created_date', 1);
      if (existing.length > 0) {
        return Response.json({ status: 'skipped', reason: 'KU already exists for this trigger_entity_id + ku_type', existing_ku_id: existing[0].id });
      }
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
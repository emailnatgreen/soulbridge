import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Auto-Generate Kinetic Units from Entity Events
 * Triggered by entity automations — no authenticated user present.
 * Creates KU + MWTPPacket directly via asServiceRole to avoid 403s
 * from chaining through millWheelEngineIngest (which uses user-scoped entities).
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

const KU_WEIGHTS = {
  governance_vote: 2.0,
  task_completion: 2.5,
  did_publication: 3.0,
  knowledge_contribution: 2.0,
  mentorship_session: 2.5,
  skill_development: 1.5,
  economic_exchange: 1.5,
  collaborative_action: 2.0,
  agent_message: 1.0,
  resource_trade: 1.2,
};

const LAW_MAP = {
  governance_vote: ['Law 8: Governance'],
  task_completion: ['Law 9: Growth', 'Law 3: Fair Share'],
  did_publication: ['Law 1: Soul', 'Law 2: Honour'],
  knowledge_contribution: ['Law 9: Growth'],
  mentorship_session: ['Law 9: Growth', 'Law 2: Honour'],
  skill_development: ['Law 9: Growth'],
  economic_exchange: ['Law 6: Exchange', 'Law 3: Fair Share'],
  collaborative_action: ['Law 2: Honour'],
  agent_message: ['Law 2: Honour'],
  resource_trade: ['Law 6: Exchange'],
};

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

async function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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

    // Idempotency guard
    if (event.entity_id) {
      const existing = await base44.asServiceRole.entities.KineticUnit.filter({
        trigger_entity_id: event.entity_id,
        ku_type: kuType,
      }, '-created_date', 1);
      if (existing.length > 0) {
        return Response.json({ status: 'skipped', reason: 'KU already exists for this trigger_entity_id + ku_type', existing_ku_id: existing[0].id });
      }
    }

    // Create KU + packet directly via asServiceRole (no chained function call)
    const weight = KU_WEIGHTS[kuType] || 1.0;
    const raw_score = 1.0;
    const weighted_score = raw_score * weight;
    const now = new Date().toISOString();
    const triggerEvent = `${entityName}.${event.type}`;

    const encoder = new TextEncoder();
    const hashed_agent_id = await toHex(await crypto.subtle.digest('SHA-256', encoder.encode(agentId + ':' + now)));
    const hashed_event_context = await toHex(await crypto.subtle.digest('SHA-256', encoder.encode(triggerEvent + ':' + (event.entity_id || '') + ':' + now)));

    const ku = await base44.asServiceRole.entities.KineticUnit.create({
      ku_type: kuType,
      agent_id: agentId,
      trigger_event: triggerEvent,
      trigger_entity_id: event.entity_id || null,
      weight,
      raw_score,
      weighted_score,
      mwtp_layer: 'micro',
      status: 'generated',
      constitutional_laws: LAW_MAP[kuType] || [],
      metadata: { auto_generated: true, source_entity: entityName, event_type: event.type },
    });

    const packet = await base44.asServiceRole.entities.MWTPPacket.create({
      packet_version: '1.0',
      layer: 'micro',
      hashed_agent_id,
      hashed_event_context,
      ku_count: 1,
      ku_ids: [ku.id],
      total_weighted_score: weighted_score,
      packet_timestamp: now,
      transmission_status: 'received',
      received_by_engine: true,
      engine_ingest_timestamp: now,
      integrity_checksum: await toHex(await crypto.subtle.digest('SHA-256', encoder.encode(ku.id + ':' + weighted_score + ':' + now))),
    });

    await base44.asServiceRole.entities.KineticUnit.update(ku.id, {
      status: 'ingested',
      mwtp_packet_id: packet.id,
    });

    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: `AutoKU_${entityName}`,
      function_name: 'autoGenerateKineticUnit',
      status: 'success',
      message: `KU generated: ${kuType} for agent ${agentId}`,
      details: { ku_type: kuType, agent_id: agentId, entity_id: event.entity_id, ku_id: ku.id, packet_id: packet.id },
      run_at: now,
      triggered_by: 'entity_event',
    });

    return Response.json({ status: 'success', ku_type: kuType, agent_id: agentId, ku_id: ku.id, packet_id: packet.id, weighted_score });

  } catch (error) {
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
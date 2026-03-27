import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Mill Wheel Engine — Data Ingestion Pipeline
 * Receives MWTP packets, parses KineticUnits, and prepares them for visualization.
 * 
 * Blueprint: Micro → Meso → Macro data flow
 * Privacy: All agent IDs remain hashed throughout; raw IDs never stored in packets.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, packet_id, packet_data } = body;

    // ── ACTION: ingest_packet ──────────────────────────────────────────────
    if (action === 'ingest_packet' && packet_data) {
      const now = new Date().toISOString();

      // Validate required fields
      const { layer, hashed_agent_id, hashed_event_context, ku_ids = [], packet_timestamp } = packet_data;
      if (!layer || !hashed_agent_id || !hashed_event_context) {
        return Response.json({ error: 'Missing required packet fields' }, { status: 400 });
      }

      // Fetch referenced KineticUnits
      const kuRecords = [];
      for (const kuId of ku_ids) {
        const kus = await base44.entities.KineticUnit.filter({ id: kuId });
        if (kus.length > 0) kuRecords.push(kus[0]);
      }

      // Compute total weighted score
      const total_weighted_score = kuRecords.reduce((sum, ku) => sum + (ku.weighted_score || ku.weight || 1.0), 0);

      // Create or update the MWTPPacket record
      const packet = await base44.entities.MWTPPacket.create({
        ...packet_data,
        total_weighted_score,
        transmission_status: 'received',
        received_by_engine: true,
        engine_ingest_timestamp: now,
      });

      // Advance KU statuses to 'ingested'
      for (const ku of kuRecords) {
        await base44.entities.KineticUnit.update(ku.id, {
          status: 'ingested',
          mwtp_packet_id: packet.id,
        });
      }

      return Response.json({
        status: 'ingested',
        packet_id: packet.id,
        ku_count: kuRecords.length,
        total_weighted_score,
        layer,
        engine_ingest_timestamp: now,
      });
    }

    // ── ACTION: generate_ku ────────────────────────────────────────────────
    // Generate a KineticUnit from a trigger event and package it into a micro packet
    if (action === 'generate_ku') {
      const { ku_type, agent_id, trigger_event, trigger_entity_id, project_id, metadata } = body;
      if (!ku_type || !agent_id || !trigger_event) {
        return Response.json({ error: 'Missing ku_type, agent_id, or trigger_event' }, { status: 400 });
      }

      // KU type weight table
      const weights = {
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

      // Constitutional law mapping
      const lawMap = {
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

      const weight = weights[ku_type] || 1.0;
      const raw_score = 1.0;
      const weighted_score = raw_score * weight;
      const now = new Date().toISOString();

      // Hash agent_id and trigger_event for privacy
      const encoder = new TextEncoder();
      const agentHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(agent_id + ':' + now));
      const eventHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(trigger_event + ':' + (trigger_entity_id || '') + ':' + now));
      const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      const hashed_agent_id = toHex(agentHashBuffer);
      const hashed_event_context = toHex(eventHashBuffer);

      // Create KineticUnit
      const ku = await base44.entities.KineticUnit.create({
        ku_type,
        agent_id,
        project_id: project_id || null,
        trigger_event,
        trigger_entity_id: trigger_entity_id || null,
        weight,
        raw_score,
        weighted_score,
        mwtp_layer: 'micro',
        status: 'generated',
        constitutional_laws: lawMap[ku_type] || [],
        metadata: metadata || {},
      });

      // Package into Micro MWTP Packet
      const packet = await base44.entities.MWTPPacket.create({
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
        integrity_checksum: toHex(await crypto.subtle.digest('SHA-256', encoder.encode(ku.id + ':' + weighted_score + ':' + now))),
        project_id: project_id || null,
      });

      // Advance KU status
      await base44.entities.KineticUnit.update(ku.id, {
        status: 'ingested',
        mwtp_packet_id: packet.id,
      });

      return Response.json({
        status: 'success',
        ku_id: ku.id,
        packet_id: packet.id,
        ku_type,
        weight,
        weighted_score,
        layer: 'micro',
        constitutional_laws: lawMap[ku_type] || [],
      });
    }

    // ── ACTION: get_grid_summary ───────────────────────────────────────────
    if (action === 'get_grid_summary') {
      const packets = await base44.entities.MWTPPacket.list('-created_date', 200);
      const kus = await base44.entities.KineticUnit.list('-created_date', 500);

      const byType = {};
      for (const ku of kus) {
        byType[ku.ku_type] = (byType[ku.ku_type] || 0) + (ku.weighted_score || 1);
      }

      return Response.json({
        total_kus: kus.length,
        total_packets: packets.length,
        total_weighted_score: kus.reduce((s, k) => s + (k.weighted_score || 1), 0),
        by_type: byType,
        recent_packets: packets.slice(0, 10),
      });
    }

    return Response.json({ error: 'Unknown action. Use: generate_ku | ingest_packet | get_grid_summary' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
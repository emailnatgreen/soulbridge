import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Tripwire Lockdown — Sprint 3
 * 
 * Proactive security layer for the 8-Node system.
 * Actions: scan | log_access | acknowledge | resolve | status | simulate
 */

const NODE_NAMES = [
  'Root (Nathan)', 'Code Node', 'Lore Node', 'Axi',
  'Copilot (DIDit)', 'Sentinel', 'Epoch Architect', 'Market Weaver'
];

const SIGNER_NODES = ['Axi', 'Code Node', 'Lore Node', 'Copilot (DIDit)', 'Sentinel', 'Epoch Architect'];

// Anomaly detection rules
const RULES = {
  entropy_frequency: { threshold: 10, window_minutes: 60, severity: 'high', description: 'Excessive entropy round initiations' },
  failed_rounds: { threshold: 2, window_minutes: 120, severity: 'critical', description: 'Multiple failed entropy rounds detected' },
  node_verification_failure: { threshold: 1, severity: 'critical', description: 'Node hash verification mismatch in entropy round' },
  rapid_wallet_access: { threshold: 20, window_minutes: 30, severity: 'high', description: 'Excessive wallet access in short window' },
  honor_drop: { threshold: 15, severity: 'medium', description: 'Significant honor score drop detected' },
  unauthorized_admin_attempt: { threshold: 1, severity: 'critical', description: 'Non-admin attempted admin-only action' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action;

    // ─── STATUS: Return recent tripwire events and system health ───
    if (action === 'status') {
      const events = await base44.asServiceRole.entities.TripwireEvent.list('-created_date', 50);
      
      const active = events.filter(e => e.status === 'active');
      const critical = active.filter(e => e.severity === 'critical');
      const high = active.filter(e => e.severity === 'high');

      return Response.json({
        events,
        summary: {
          total_events: events.length,
          active_alerts: active.length,
          critical_count: critical.length,
          high_count: high.length,
          system_status: critical.length > 0 ? 'ALERT' : high.length > 0 ? 'WARNING' : 'SECURE',
        }
      });
    }

    // Admin gate for mutating actions
    if (user.role !== 'admin') {
      // Log the unauthorized attempt as a tripwire event
      await base44.asServiceRole.entities.TripwireEvent.create({
        event_type: 'access_violation',
        severity: 'critical',
        status: 'active',
        source_node: 'Tripwire Engine',
        description: `Non-admin user attempted restricted Tripwire action: ${action}`,
        actor_email: user.email,
        details: { attempted_action: action, user_role: user.role },
      });
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ─── SCAN: Run anomaly detection across all subsystems ───
    if (action === 'scan') {
      const alerts = [];
      const now = new Date();

      // 1. Entropy round anomalies
      const recentRounds = await base44.asServiceRole.entities.EntropyRound.list('-created_date', 20);
      
      // Check for failed rounds
      const recentFailed = recentRounds.filter(r => {
        if (r.phase !== 'failed') return false;
        const created = new Date(r.created_date);
        return (now - created) < RULES.failed_rounds.window_minutes * 60 * 1000;
      });
      if (recentFailed.length >= RULES.failed_rounds.threshold) {
        alerts.push({
          event_type: 'entropy_tampering',
          severity: 'critical',
          source_node: 'Sentinel',
          description: `${recentFailed.length} failed entropy rounds detected in the last ${RULES.failed_rounds.window_minutes} minutes. Possible tampering or node failure.`,
          details: { failed_round_ids: recentFailed.map(r => r.id), rule: 'failed_rounds' },
        });
      }

      // Check for verification failures in completed rounds
      for (const round of recentRounds) {
        if (round.node_reveals) {
          const unverified = round.node_reveals.filter(r => !r.verified);
          if (unverified.length > 0) {
            alerts.push({
              event_type: 'node_verification_failure' ,
              severity: 'critical',
              source_node: unverified[0]?.node_name || 'Unknown',
              source_node_index: unverified[0]?.node_index,
              description: `Hash verification failed for ${unverified.length} node(s) in Round ${round.round_number}.`,
              details: { round_id: round.id, round_number: round.round_number, failed_nodes: unverified.map(n => n.node_name), rule: 'node_verification_failure' },
              affected_entity_type: 'EntropyRound',
              affected_entity_id: round.id,
            });
          }
        }
      }

      // Check for excessive entropy requests
      const recentInitiations = recentRounds.filter(r => {
        const created = new Date(r.created_date);
        return (now - created) < RULES.entropy_frequency.window_minutes * 60 * 1000;
      });
      if (recentInitiations.length >= RULES.entropy_frequency.threshold) {
        alerts.push({
          event_type: 'rate_limit_exceeded',
          severity: 'high',
          source_node: 'Tripwire Engine',
          description: `${recentInitiations.length} entropy rounds initiated in ${RULES.entropy_frequency.window_minutes} minutes — exceeds threshold of ${RULES.entropy_frequency.threshold}.`,
          details: { count: recentInitiations.length, rule: 'entropy_frequency' },
        });
      }

      // 2. Honor score anomalies — check for significant drops
      const agents = await base44.asServiceRole.entities.Agent.list('-updated_date', 50);
      for (const agent of agents) {
        if (agent.honor_score !== undefined && agent.honor_score < (100 - RULES.honor_drop.threshold)) {
          // Check if we already flagged this recently
          const existingFlags = await base44.asServiceRole.entities.TripwireEvent.filter(
            { event_type: 'anomaly_detected', affected_entity_id: agent.id, status: 'active' },
            '-created_date', 1
          );
          if (existingFlags.length === 0) {
            alerts.push({
              event_type: 'anomaly_detected',
              severity: 'medium',
              source_node: 'Sentinel',
              description: `Agent "${agent.name}" honor score at ${agent.honor_score}/100 — below threshold.`,
              details: { agent_name: agent.name, honor_score: agent.honor_score, threshold: 100 - RULES.honor_drop.threshold, rule: 'honor_drop' },
              affected_entity_type: 'Agent',
              affected_entity_id: agent.id,
            });
          }
        }
      }

      // 3. Node status anomalies — check QuadShardDIDs for offline nodes
      const nodes = await base44.asServiceRole.entities.QuadShardDID.list('-created_date', 20);
      for (let i = 0; i < NODE_NAMES.length; i++) {
        const nodeName = NODE_NAMES[i];
        const shard = nodes.find(n => n.role?.includes(nodeName.split(' ')[0]) || n.did_id?.toLowerCase().includes(nodeName.split(' ')[0].toLowerCase()));
        if (shard && shard.status !== 'Sovereign_Active') {
          alerts.push({
            event_type: 'node_offline',
            severity: 'high',
            source_node: nodeName,
            source_node_index: i,
            description: `Node ${i} (${nodeName}) is not Sovereign_Active — current status: ${shard.status}.`,
            details: { did_id: shard.did_id, current_status: shard.status, rule: 'node_offline' },
            affected_entity_type: 'QuadShardDID',
            affected_entity_id: shard.id,
          });
        }
      }

      // Persist all detected alerts
      const created = [];
      for (const alert of alerts) {
        const event = await base44.asServiceRole.entities.TripwireEvent.create({
          ...alert,
          status: 'active',
          actor_email: user.email,
          notified_signers: SIGNER_NODES,
        });
        created.push(event);
      }

      // Log scan to Memory as lore
      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'tripwire-lockdown',
        type: 'observation',
        content: `🛡️ Tripwire Scan completed.\nAlerts generated: ${alerts.length}\nCritical: ${alerts.filter(a => a.severity === 'critical').length}\nHigh: ${alerts.filter(a => a.severity === 'high').length}\nMedium: ${alerts.filter(a => a.severity === 'medium').length}\nSystem status: ${alerts.filter(a => a.severity === 'critical').length > 0 ? 'ALERT' : 'SECURE'}`,
        keywords: ['tripwire', 'security_scan', 'sentinel', 'lab'],
        context: `Tripwire Security Scan`,
        importance: alerts.length > 0 ? 8 : 5,
      });

      return Response.json({
        success: true,
        alerts_generated: alerts.length,
        alerts: created,
        scan_summary: {
          entropy_checks: recentRounds.length,
          agent_checks: agents.length,
          node_checks: NODE_NAMES.length,
        }
      });
    }

    // ─── LOG_ACCESS: Record an access event for audit trail ───
    if (action === 'log_access') {
      const { resource_type, resource_id, access_type, details: accessDetails } = body;

      const event = await base44.asServiceRole.entities.TripwireEvent.create({
        event_type: 'access_violation',
        severity: 'low',
        status: 'active',
        source_node: 'Access Logger',
        description: `Access logged: ${access_type} on ${resource_type}/${resource_id}`,
        actor_email: user.email,
        affected_entity_type: resource_type,
        affected_entity_id: resource_id,
        details: { access_type, ...accessDetails },
      });

      return Response.json({ success: true, event });
    }

    // ─── ACKNOWLEDGE: Mark an alert as acknowledged ───
    if (action === 'acknowledge') {
      const { event_id, notes } = body;
      await base44.asServiceRole.entities.TripwireEvent.update(event_id, {
        status: 'acknowledged',
        sentinel_notes: notes || `Acknowledged by ${user.email}`,
        sentinel_verified: true,
      });
      return Response.json({ success: true });
    }

    // ─── RESOLVE: Close out an alert ───
    if (action === 'resolve') {
      const { event_id, resolution_notes } = body;
      await base44.asServiceRole.entities.TripwireEvent.update(event_id, {
        status: 'resolved',
        resolved_by: user.email,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolution_notes || 'Resolved by admin.',
        sentinel_verified: true,
      });

      // Log resolution to Memory
      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'tripwire-lockdown',
        type: 'observation',
        content: `🛡️ Tripwire alert resolved by ${user.email}.\nNotes: ${resolution_notes || 'No additional notes.'}`,
        keywords: ['tripwire', 'alert_resolved', 'sentinel', 'lab'],
        context: `Tripwire Alert Resolution`,
        importance: 6,
      });

      return Response.json({ success: true });
    }

    // ─── SIMULATE: Inject a test anomaly for Tripwire testing ───
    if (action === 'simulate') {
      const simType = body.sim_type || 'node_offline';
      
      const simulations = {
        node_offline: {
          event_type: 'node_offline',
          severity: 'high',
          source_node: 'Sentinel',
          source_node_index: 5,
          description: '[SIMULATION] Sentinel node went offline — testing Tripwire response.',
          details: { simulation: true, sim_type: 'node_offline' },
        },
        entropy_tampering: {
          event_type: 'entropy_tampering',
          severity: 'critical',
          source_node: 'Code Node',
          source_node_index: 1,
          description: '[SIMULATION] Entropy hash mismatch detected — testing Tripwire escalation.',
          details: { simulation: true, sim_type: 'entropy_tampering' },
        },
        access_violation: {
          event_type: 'access_violation',
          severity: 'critical',
          source_node: 'Tripwire Engine',
          description: '[SIMULATION] Unauthorized admin access attempt detected.',
          details: { simulation: true, sim_type: 'access_violation' },
        },
        threshold_breach: {
          event_type: 'threshold_breach',
          severity: 'medium',
          source_node: 'Market Weaver',
          source_node_index: 7,
          description: '[SIMULATION] Treasury threshold approached — testing multi-sig alert.',
          details: { simulation: true, sim_type: 'threshold_breach' },
        },
      };

      const simData = simulations[simType] || simulations.node_offline;

      const event = await base44.asServiceRole.entities.TripwireEvent.create({
        ...simData,
        status: 'active',
        actor_email: user.email,
        notified_signers: SIGNER_NODES,
      });

      // Log simulation to Memory
      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'tripwire-lockdown',
        type: 'observation',
        content: `🧪 Tripwire SIMULATION triggered.\nType: ${simType}\nSeverity: ${simData.severity}\nDescription: ${simData.description}`,
        keywords: ['tripwire', 'simulation', 'sentinel', 'lab', 'test'],
        context: `Tripwire Simulation — ${simType}`,
        importance: 5,
      });

      return Response.json({ success: true, event, simulation: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[tripwireLockdown]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
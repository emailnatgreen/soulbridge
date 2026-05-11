import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Node Context Sync — Phase 3: 8-Node Contextual Sync
 *
 * Assembles a unified context frame from all 8 consortium nodes so that
 * every system component — agents, gates, monitors — operates from a
 * single, verified, timestamped snapshot of the network's state.
 *
 * Actions:
 *   sync     — Gather live state from all 8 nodes, produce a Context Frame
 *   latest   — Return the most recent Context Frame without re-syncing
 *   history  — Return recent Context Frame history for trend analysis
 *
 * Each Context Frame captures:
 *   - Node health (online/offline, last activity)
 *   - Entropy status (latest round, XOR integrity)
 *   - Compressed Attention threat level
 *   - Hydrogeo Gate statistics (Phase 1)
 *   - Soul Signature standing (Phase 2)
 *   - Tripwire pressure (active events by severity)
 *   - Covenant signature status
 *
 * The frame is stored as an immutable Memory record tagged 'node_context_sync'.
 */

const SYNC_AGENT_ID = 'node-context-sync';

const NODE_NAMES = [
  'Node 0 (Source)', 'Sentinel Node', 'Lore Node', 'Truth Weaver',
  'Did It Node', 'Soulbridge (Axi)', 'Human Node', 'Code Node'
];

const NODE_ADDRESSES = [
  'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg',
  'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32',
  'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7',
  'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV',
  'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',
  'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',
  'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',
  'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'sync';

    // ─── LATEST ───
    if (action === 'latest') {
      const frames = await base44.asServiceRole.entities.Memory.filter(
        { agent_id: SYNC_AGENT_ID, type: 'observation' },
        '-created_date', 1
      );

      if (frames.length === 0) {
        return Response.json({ frame: null, message: 'No context frames yet. Run sync first.' });
      }

      const frame = frames[0];
      let parsed = null;
      try { parsed = JSON.parse(frame.context || '{}'); } catch (_e) { /* ignore */ }

      return Response.json({
        frame_id: frame.id,
        summary: frame.content,
        data: parsed,
        created_date: frame.created_date,
        importance: frame.importance,
      });
    }

    // ─── HISTORY ───
    if (action === 'history') {
      const limit = body.limit || 20;
      const frames = await base44.asServiceRole.entities.Memory.filter(
        { agent_id: SYNC_AGENT_ID, type: 'observation' },
        '-created_date', limit
      );

      return Response.json({
        count: frames.length,
        frames: frames.map(f => {
          let parsed = null;
          try { parsed = JSON.parse(f.context || '{}'); } catch (_e) { /* ignore */ }
          return {
            frame_id: f.id,
            summary: f.content?.substring(0, 200),
            data: parsed,
            created_date: f.created_date,
            importance: f.importance,
          };
        }),
      });
    }

    // ─── SYNC — Admin only ───
    if (action === 'sync') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const startTime = Date.now();

      // 1. Gather data from all subsystems in parallel
      const [
        covenantSigs,
        entropyRounds,
        activeTripwires,
        hydrogeoAudit,
        soulSigAudit,
        caMemories,
        agents,
      ] = await Promise.all([
        base44.asServiceRole.entities.NodeCovenantSignature.list('-created_date', 20),
        base44.asServiceRole.entities.EntropyRound.list('-round_number', 3),
        base44.asServiceRole.entities.TripwireEvent.filter({ status: 'active' }, '-created_date', 50),
        base44.asServiceRole.entities.Memory.filter({ agent_id: 'hydrogeo-gate' }, '-created_date', 10),
        base44.asServiceRole.entities.Memory.filter({ agent_id: 'soul-signature-gate' }, '-created_date', 10),
        base44.asServiceRole.entities.Memory.filter({ agent_id: 'compressed-attention-node8' }, '-created_date', 3),
        base44.asServiceRole.entities.Agent.list('-updated_date', 50),
      ]);

      // 2. Build per-node health status
      const nodeStates = NODE_NAMES.map((name, index) => {
        const address = NODE_ADDRESSES[index];

        // Covenant status for this node
        const sig = covenantSigs.find(s => s.node_address === address || s.node_name === name);
        const covenantStatus = sig ? sig.status : 'unsigned';

        // Check if this node produced any recent tripwire events
        const nodeTrips = activeTripwires.filter(t =>
          t.source_node?.includes(name) || t.source_node_index === index
        );

        // Check entropy participation
        const latestRound = entropyRounds[0];
        let entropyParticipant = false;
        if (latestRound?.node_commits) {
          entropyParticipant = latestRound.node_commits.some(c => c.node_index === index);
        }

        return {
          index,
          name,
          address,
          covenant: covenantStatus,
          active_tripwires: nodeTrips.length,
          entropy_participating: entropyParticipant,
          status: nodeTrips.length > 3 ? 'stressed' : covenantStatus === 'signed' ? 'healthy' : 'unsigned',
        };
      });

      // 3. Entropy health
      const latestRound = entropyRounds[0];
      const entropyHealth = {
        latest_round: latestRound?.round_number || 0,
        phase: latestRound?.phase || 'none',
        participating_nodes: latestRound?.participating_nodes || 0,
        sentinel_verified: latestRound?.sentinel_verified || false,
        xor_available: !!latestRound?.xor_result,
      };

      // 4. Compressed Attention threat level
      const lastCA = caMemories[0];
      let threatLevel = 'UNKNOWN';
      let maxScore = 0;
      if (lastCA) {
        const content = lastCA.content || '';
        const threatMatch = content.match(/Threat Level:\s*(\w+)/);
        const maxMatch = content.match(/Max:\s*(\d+)\/100/);
        if (threatMatch) threatLevel = threatMatch[1];
        if (maxMatch) maxScore = parseInt(maxMatch[1], 10);
      }

      // 5. Tripwire pressure
      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const e of activeTripwires) {
        if (severityCounts[e.severity] !== undefined) severityCounts[e.severity]++;
      }

      // 6. Phase 1 — Hydrogeo gate stats
      const hydrogeoStats = {
        total: hydrogeoAudit.length,
        granted: hydrogeoAudit.filter(r => r.content?.includes('GRANTED')).length,
        denied: hydrogeoAudit.filter(r => r.content?.includes('DENIED') || r.content?.includes('BLOCKED')).length,
      };

      // 7. Phase 2 — Soul Signature stats
      const soulStats = {
        total: soulSigAudit.length,
        approved: soulSigAudit.filter(r => r.content?.includes('APPROVED')).length,
        denied: soulSigAudit.filter(r => r.content?.includes('DENIED') || r.content?.includes('REJECTED')).length,
        caution: soulSigAudit.filter(r => r.content?.includes('CAUTION')).length,
      };

      // 8. Agent population summary
      const agentSummary = {
        total: agents.length,
        active: agents.filter(a => a.status === 'active').length,
        suspended: agents.filter(a => a.status === 'suspended').length,
        avg_honour: agents.length > 0
          ? Math.round(agents.reduce((s, a) => s + (a.honor_score || 0), 0) / agents.length)
          : 0,
      };

      // 9. Compute overall network health score (0-100)
      let networkScore = 100;
      // Deductions
      networkScore -= severityCounts.critical * 15;
      networkScore -= severityCounts.high * 8;
      networkScore -= severityCounts.medium * 3;
      const unsignedNodes = nodeStates.filter(n => n.covenant === 'unsigned' || n.covenant === 'pending').length;
      networkScore -= unsignedNodes * 5;
      const stressedNodes = nodeStates.filter(n => n.status === 'stressed').length;
      networkScore -= stressedNodes * 10;
      if (entropyHealth.phase === 'failed') networkScore -= 15;
      if (threatLevel === 'CRITICAL') networkScore -= 20;
      else if (threatLevel === 'ELEVATED') networkScore -= 10;
      networkScore = Math.max(0, Math.min(100, networkScore));

      const networkStatus = networkScore >= 80 ? 'NOMINAL'
        : networkScore >= 60 ? 'GUARDED'
        : networkScore >= 40 ? 'ELEVATED'
        : 'CRITICAL';

      const elapsedMs = Date.now() - startTime;

      // 10. Assemble the Context Frame
      const contextFrame = {
        label: 'Node Context Frame',
        version: '3.0.0',
        synced_at: new Date().toISOString(),
        processing_ms: elapsedMs,
        network: {
          score: networkScore,
          status: networkStatus,
          node_count: 8,
          healthy: nodeStates.filter(n => n.status === 'healthy').length,
          stressed: stressedNodes,
          unsigned: unsignedNodes,
        },
        nodes: nodeStates,
        entropy: entropyHealth,
        attention: { threat_level: threatLevel, max_score: maxScore, last_analysis: lastCA?.created_date },
        tripwire: { active: activeTripwires.length, severity: severityCounts },
        gates: { hydrogeo: hydrogeoStats, soul_signature: soulStats },
        agents: agentSummary,
      };

      // 11. Build human-readable summary
      const summary = [
        `🌐 NODE CONTEXT FRAME — ${networkStatus} (${networkScore}/100)`,
        `Synced: ${contextFrame.synced_at} | ${elapsedMs}ms`,
        ``,
        `NODES: ${nodeStates.filter(n => n.status === 'healthy').length}/8 healthy, ${stressedNodes} stressed, ${unsignedNodes} unsigned`,
        `ENTROPY: Round #${entropyHealth.latest_round} (${entropyHealth.phase}) | ${entropyHealth.participating_nodes}/8 nodes | Sentinel: ${entropyHealth.sentinel_verified ? 'YES' : 'NO'}`,
        `ATTENTION: ${threatLevel} | Max: ${maxScore}/100`,
        `TRIPWIRES: ${activeTripwires.length} active [C:${severityCounts.critical} H:${severityCounts.high} M:${severityCounts.medium} L:${severityCounts.low}]`,
        `HYDROGEO: ${hydrogeoStats.granted} granted / ${hydrogeoStats.denied} denied (recent 10)`,
        `SOUL SIG: ${soulStats.approved} approved / ${soulStats.denied} denied / ${soulStats.caution} caution (recent 10)`,
        `AGENTS: ${agentSummary.total} total, ${agentSummary.active} active | Avg Honour: ${agentSummary.avg_honour}`,
      ].join('\n');

      // 12. Store immutable frame
      await base44.asServiceRole.entities.Memory.create({
        agent_id: SYNC_AGENT_ID,
        type: 'observation',
        content: summary,
        keywords: ['node_context_sync', 'phase_3', 'context_frame', networkStatus.toLowerCase(), 'sovereign_guard'],
        context: JSON.stringify(contextFrame),
        importance: networkStatus === 'CRITICAL' ? 9 : networkStatus === 'ELEVATED' ? 7 : 5,
        related_entity_type: 'System',
      });

      return Response.json({
        success: true,
        frame: contextFrame,
        summary,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[nodeContextSync]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
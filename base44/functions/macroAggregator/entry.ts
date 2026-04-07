import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * MWTP Macro-Level Aggregator
 * Aggregates meso-level MWTPPackets into macro-level daily summary packets.
 * 
 * Logic: Groups meso packets by day window and creates macro packets
 * that summarise the full daily kinetic flow for the Village.
 * 
 * Run via scheduled automation every 6 hours.
 * Requires at least 2 meso packets in a day window to trigger aggregation.
 */

async function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const allPackets = await base44.asServiceRole.entities.MWTPPacket.list('-created_date', 2000);
    const mesoPackets = allPackets.filter(p => p.layer === 'meso');
    const existingMacro = allPackets.filter(p => p.layer === 'macro');

    // Collect all meso KU IDs already covered by existing macro packets
    const coveredKuIds = new Set();
    existingMacro.forEach(mp => {
      (mp.ku_ids || []).forEach(id => coveredKuIds.add(id));
    });

    // Filter meso packets to those NOT already aggregated into macro
    const unaggregated = mesoPackets.filter(p => {
      const kuIds = p.ku_ids || [];
      return kuIds.some(id => !coveredKuIds.has(id));
    });

    if (unaggregated.length === 0) {
      return Response.json({ status: 'no_new_meso_packets', macro_created: 0 });
    }

    // Group by day windows
    const dayBuckets = {};
    unaggregated.forEach(p => {
      const ts = p.packet_timestamp || p.created_date;
      const date = new Date(ts);
      const dayKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
      if (!dayBuckets[dayKey]) dayBuckets[dayKey] = [];
      dayBuckets[dayKey].push(p);
    });

    const created = [];
    const encoder = new TextEncoder();
    const now = new Date().toISOString();

    for (const [dayKey, packets] of Object.entries(dayBuckets)) {
      // Only aggregate if we have 2+ meso packets in the day
      if (packets.length < 2) continue;

      const allKuIds = packets.flatMap(p => p.ku_ids || []).filter(id => !coveredKuIds.has(id));
      if (allKuIds.length === 0) continue;

      const totalScore = packets.reduce((s, p) => s + (p.total_weighted_score || 0), 0);
      const uniqueAgentHashes = [...new Set(packets.map(p => p.hashed_agent_id).filter(Boolean))];
      const totalMesoPackets = packets.length;
      const totalMicroPackets = packets.reduce((s, p) => s + (p.metadata?.micro_packet_count || 0), 0);

      const macroHash = await toHex(
        await crypto.subtle.digest('SHA-256', encoder.encode(`macro:${dayKey}:${allKuIds.length}:${now}`))
      );
      const checksumHash = await toHex(
        await crypto.subtle.digest('SHA-256', encoder.encode(`${totalScore}:${allKuIds.length}:${dayKey}:macro`))
      );

      const macroPacket = await base44.asServiceRole.entities.MWTPPacket.create({
        packet_version: '1.0',
        layer: 'macro',
        hashed_agent_id: macroHash,
        hashed_event_context: `macro_aggregation:${dayKey}`,
        ku_count: allKuIds.length,
        ku_ids: allKuIds,
        total_weighted_score: parseFloat(totalScore.toFixed(2)),
        packet_timestamp: `${dayKey}T00:00:00.000Z`,
        transmission_status: 'received',
        received_by_engine: true,
        engine_ingest_timestamp: now,
        integrity_checksum: checksumHash,
        metadata: {
          aggregation_type: 'daily',
          day_window: dayKey,
          meso_packet_count: totalMesoPackets,
          micro_packet_count: totalMicroPackets,
          unique_agent_hashes: uniqueAgentHashes.length,
          meso_packet_ids: packets.map(p => p.id),
        },
      });

      created.push({
        macro_id: macroPacket.id,
        day: dayKey,
        meso_packets: totalMesoPackets,
        micro_packets: totalMicroPackets,
        ku_count: allKuIds.length,
        total_score: totalScore,
      });

      // Mark these KU IDs as covered
      allKuIds.forEach(id => coveredKuIds.add(id));
    }

    return Response.json({
      status: 'success',
      macro_packets_created: created.length,
      total_meso_processed: unaggregated.length,
      details: created,
      timestamp: now,
    });
  } catch (error) {
    console.error('[macroAggregator] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
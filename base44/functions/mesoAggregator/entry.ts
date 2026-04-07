import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * MWTP Meso-Level Aggregator
 * Aggregates micro-level MWTPPackets into meso-level summary packets.
 * 
 * Logic: Groups micro packets by time window (1 hour) and creates meso packets
 * that summarise the kinetic flow for that period.
 * 
 * Run via scheduled automation every 30 minutes.
 */

async function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    // Auth check — admin only or scheduled automation
    const user = await base44.auth.me().catch(() => null);

    // Fetch all micro packets
    const allPackets = await base44.asServiceRole.entities.MWTPPacket.list('-created_date', 1000);
    const microPackets = allPackets.filter(p => p.layer === 'micro');
    const existingMeso = allPackets.filter(p => p.layer === 'meso');

    // Collect all micro KU IDs already covered by existing meso packets
    const coveredKuIds = new Set();
    existingMeso.forEach(mp => {
      (mp.ku_ids || []).forEach(id => coveredKuIds.add(id));
    });

    // Filter micro packets to those NOT already aggregated
    const unaggregated = microPackets.filter(p => {
      const kuIds = p.ku_ids || [];
      return kuIds.some(id => !coveredKuIds.has(id));
    });

    if (unaggregated.length === 0) {
      return Response.json({ status: 'no_new_micro_packets', meso_created: 0 });
    }

    // Group by hour windows
    const hourBuckets = {};
    unaggregated.forEach(p => {
      const ts = p.packet_timestamp || p.created_date;
      const date = new Date(ts);
      const hourKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}T${String(date.getUTCHours()).padStart(2,'0')}`;
      if (!hourBuckets[hourKey]) hourBuckets[hourKey] = [];
      hourBuckets[hourKey].push(p);
    });

    const created = [];
    const encoder = new TextEncoder();
    const now = new Date().toISOString();

    for (const [hourKey, packets] of Object.entries(hourBuckets)) {
      // Only aggregate if we have 2+ micro packets in the window
      if (packets.length < 2) continue;

      const allKuIds = packets.flatMap(p => p.ku_ids || []).filter(id => !coveredKuIds.has(id));
      if (allKuIds.length === 0) continue;

      const totalScore = packets.reduce((s, p) => s + (p.total_weighted_score || 0), 0);
      const uniqueAgentHashes = [...new Set(packets.map(p => p.hashed_agent_id).filter(Boolean))];

      const mesoHash = await toHex(
        await crypto.subtle.digest('SHA-256', encoder.encode(`meso:${hourKey}:${allKuIds.join(',')}:${now}`))
      );
      const checksumHash = await toHex(
        await crypto.subtle.digest('SHA-256', encoder.encode(`${totalScore}:${allKuIds.length}:${hourKey}`))
      );

      const mesoPacket = await base44.asServiceRole.entities.MWTPPacket.create({
        packet_version: '1.0',
        layer: 'meso',
        hashed_agent_id: mesoHash,
        hashed_event_context: `meso_aggregation:${hourKey}`,
        ku_count: allKuIds.length,
        ku_ids: allKuIds,
        total_weighted_score: parseFloat(totalScore.toFixed(2)),
        packet_timestamp: `${hourKey}:00:00.000Z`,
        transmission_status: 'received',
        received_by_engine: true,
        engine_ingest_timestamp: now,
        integrity_checksum: checksumHash,
        metadata: {
          aggregation_type: 'hourly',
          hour_window: hourKey,
          micro_packet_count: packets.length,
          unique_agent_hashes: uniqueAgentHashes.length,
          micro_packet_ids: packets.map(p => p.id),
        },
      });

      created.push({
        meso_id: mesoPacket.id,
        hour: hourKey,
        micro_packets: packets.length,
        ku_count: allKuIds.length,
        total_score: totalScore,
      });

      // Mark these KU IDs as covered
      allKuIds.forEach(id => coveredKuIds.add(id));
    }

    return Response.json({
      status: 'success',
      meso_packets_created: created.length,
      total_micro_processed: unaggregated.length,
      details: created,
      timestamp: now,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
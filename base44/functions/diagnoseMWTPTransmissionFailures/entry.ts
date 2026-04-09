import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * MWTP TRANSMISSION FAILURE DIAGNOSIS
 * Analyzes MWTPPacket records for transmission degradation, packet loss, and Mill Wheel Engine ingestion failures.
 * Identifies root causes of kinetic grid packet loss during critical period.
 * Code Node diagnostic tool.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      diagnostician: user.email,
      diagnosis_target: 'MWTP Transmission Pipeline',
    };

    // Fetch MWTP packets across full timeline
    const allPackets = await base44.entities.MWTPPacket.list('-packet_timestamp', 1000).catch(() => []);
    
    const criticalPeriodStart = new Date('2026-04-09T09:00:00Z');
    const criticalPeriodEnd = new Date('2026-04-09T12:00:00Z');
    const preIncidentPeriodStart = new Date('2026-04-08T09:00:00Z');
    const preIncidentPeriodEnd = new Date('2026-04-09T08:59:59Z');

    // Filter by period
    const criticalPackets = allPackets.filter(p => {
      const pTime = new Date(p.packet_timestamp);
      return pTime >= criticalPeriodStart && pTime <= criticalPeriodEnd;
    });

    const preIncidentPackets = allPackets.filter(p => {
      const pTime = new Date(p.packet_timestamp);
      return pTime >= preIncidentPeriodStart && pTime <= preIncidentPeriodEnd;
    });

    // Analysis 1: Transmission Success Rates
    const preIncidentSuccess = preIncidentPackets.filter(p => p.transmission_status === 'transmitted' || p.transmission_status === 'received').length;
    const preIncidentTotal = preIncidentPackets.length;
    const preIncidentRate = preIncidentTotal > 0 ? (preIncidentSuccess / preIncidentTotal * 100).toFixed(1) : 0;

    const criticalSuccess = criticalPackets.filter(p => p.transmission_status === 'transmitted' || p.transmission_status === 'received').length;
    const criticalTotal = criticalPackets.length;
    const criticalRate = criticalTotal > 0 ? (criticalSuccess / criticalTotal * 100).toFixed(1) : 0;

    const successRateDrop = parseFloat(preIncidentRate) - parseFloat(criticalRate);

    // Analysis 2: Packet Status Breakdown
    const criticalStatusBreakdown = {
      transmitted: criticalPackets.filter(p => p.transmission_status === 'transmitted').length,
      received: criticalPackets.filter(p => p.transmission_status === 'received').length,
      pending: criticalPackets.filter(p => p.transmission_status === 'pending').length,
      failed: criticalPackets.filter(p => p.transmission_status === 'failed').length,
    };

    // Analysis 3: Mill Wheel Engine Ingestion Failures
    const engineIngestionFailures = criticalPackets.filter(p => !p.received_by_engine || p.received_by_engine === false);

    // Analysis 4: KU Loss Analysis
    const totalKUsInCriticalPeriod = criticalPackets.reduce((sum, p) => sum + (p.ku_count || 0), 0);
    const totalKUsInPreIncident = preIncidentPackets.reduce((sum, p) => sum + (p.ku_count || 0), 0);
    const kuLossPercentage = totalKUsInPreIncident > 0 
      ? ((1 - (totalKUsInCriticalPeriod / totalKUsInPreIncident)) * 100).toFixed(1)
      : 0;

    // Analysis 5: Packet Timeout/Latency Issues
    const slowPackets = criticalPackets.filter(p => {
      if (!p.engine_ingest_timestamp || !p.packet_timestamp) return false;
      const ingestTime = new Date(p.engine_ingest_timestamp);
      const packetTime = new Date(p.packet_timestamp);
      const latencyMs = ingestTime.getTime() - packetTime.getTime();
      return latencyMs > 5000; // > 5 second latency
    });

    // Compile failure root causes
    const rootCauses = [];
    
    if (successRateDrop > 20) {
      rootCauses.push({
        cause: 'TRANSMISSION_DEGRADATION',
        severity: 'CRITICAL',
        description: `Transmission success rate dropped ${successRateDrop.toFixed(1)}% during critical period`,
        evidence: `Pre-incident: ${preIncidentRate}% success | Critical period: ${criticalRate}% success`,
      });
    }

    if (engineIngestionFailures.length > criticalTotal * 0.1) {
      rootCauses.push({
        cause: 'MILL_WHEEL_ENGINE_INGESTION_FAILURE',
        severity: 'CRITICAL',
        description: `${engineIngestionFailures.length} packets failed to reach Mill Wheel Engine`,
        evidence: `${(engineIngestionFailures.length / criticalTotal * 100).toFixed(1)}% of packets not ingested`,
        affected_packet_ids: engineIngestionFailures.slice(0, 10).map(p => p.id),
      });
    }

    if (slowPackets.length > 0) {
      rootCauses.push({
        cause: 'PACKET_LATENCY',
        severity: 'HIGH',
        description: `${slowPackets.length} packets experienced > 5 second latency`,
        evidence: `Network or Mill Wheel Engine processing bottleneck detected`,
        sample_latencies: slowPackets.slice(0, 5).map(p => ({
          packet_id: p.id,
          latency_ms: (new Date(p.engine_ingest_timestamp).getTime() - new Date(p.packet_timestamp).getTime()),
        })),
      });
    }

    if (kuLossPercentage > 20) {
      rootCauses.push({
        cause: 'KU_LOSS_IN_TRANSIT',
        severity: 'CRITICAL',
        description: `${kuLossPercentage}% of Kinetic Units were lost during critical period`,
        evidence: `Pre-incident KUs: ${totalKUsInPreIncident} | Critical period KUs: ${totalKUsInCriticalPeriod}`,
      });
    }

    diagnosticReport.transmission_analysis = {
      pre_incident_success_rate: `${preIncidentRate}%`,
      critical_period_success_rate: `${criticalRate}%`,
      success_rate_degradation: `${successRateDrop.toFixed(1)}%`,
      packets_in_critical_period: criticalTotal,
      packets_in_pre_incident: preIncidentTotal,
    };

    diagnosticReport.packet_status_breakdown = criticalStatusBreakdown;
    diagnosticReport.mill_wheel_ingestion = {
      total_packets: criticalTotal,
      failed_ingestion: engineIngestionFailures.length,
      ingestion_failure_rate: `${(engineIngestionFailures.length / criticalTotal * 100).toFixed(1)}%`,
    };

    diagnosticReport.kinetic_unit_loss = {
      pre_incident_total_kus: totalKUsInPreIncident,
      critical_period_total_kus: totalKUsInCriticalPeriod,
      loss_percentage: `${kuLossPercentage}%`,
    };

    diagnosticReport.root_causes = rootCauses;
    diagnosticReport.severity = rootCauses.some(c => c.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH';

    diagnosticReport.remediation_recommended = [
      {
        action: 'INSPECT_MILL_WHEEL_ENGINE_LOGS',
        priority: 'CRITICAL',
        description: 'Review Mill Wheel Engine ingestion pipeline for bottlenecks or crashes during 2026-04-09T09:00-12:00Z',
      },
      {
        action: 'CHECK_NETWORK_CONNECTIVITY',
        priority: 'HIGH',
        description: 'Verify network stability and packet routing between MWTP sources and Mill Wheel Engine',
      },
      {
        action: 'RESTART_MWTP_PIPELINE',
        priority: 'HIGH',
        description: 'Gracefully restart MWTP transmission pipeline to clear any stuck packet queues',
      },
      {
        action: 'RESYNC_FAILED_PACKETS',
        priority: 'MEDIUM',
        description: 'Retransmit failed and pending packets once pipeline is stabilized',
      },
    ];

    return Response.json(diagnosticReport);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
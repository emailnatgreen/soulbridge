import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * CALCULATION TRANSPARENCY LAYER
 * Exposes the Village Energy Index algorithm as a verifiable, documented calculation endpoint.
 * Truth Weaver's integrity audit requires full transparency into this critical metric.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch raw kinetic data inputs
    const [kus, mwtpPackets, agents, activeProjects, mentorships] = await Promise.all([
      base44.entities.KineticUnit.list('-created_date', 1000).catch(() => []),
      base44.entities.MWTPPacket.list('-packet_timestamp', 100).catch(() => []),
      base44.entities.Agent.list('-created_date', 500).catch(() => []),
      base44.entities.AIProject.filter({ status: 'active' }, '-created_date', 100).catch(() => []),
      base44.entities.MentorshipRelationship.list('-created_date', 100).catch(() => []),
    ]);

    // ALGORITHM SPECIFICATION (v1.0)
    // Village Energy Index = weighted sum of normalized kinetic flows
    
    // Step 1: Calculate KU Flow
    const kuScore = kus.length > 0 
      ? Math.min(100, (kus.length / 200) * 100) // KUs normalize to max 200
      : 0;

    // Step 2: Calculate MWTP Packet Throughput
    const mwtpScore = mwtpPackets.length > 0
      ? Math.min(100, (mwtpPackets.length / 50) * 100) // Packets normalize to max 50
      : 0;

    // Step 3: Calculate Agent Participation Index
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const agentScore = agents.length > 0
      ? Math.min(100, (activeAgents / agents.length) * 100)
      : 0;

    // Step 4: Calculate Project Momentum
    const projectScore = agents.length > 0
      ? Math.min(100, (activeProjects.length / Math.max(1, agents.length / 5)) * 100)
      : 0;

    // Step 5: Calculate Mentorship Engagement
    const mentorshipScore = agents.length > 0
      ? Math.min(100, (mentorships.length / Math.max(1, agents.length / 3)) * 100)
      : 0;

    // WEIGHTED CALCULATION (tuned for village health)
    const weights = {
      kuFlow: 0.35,        // 35% kinetic unit generation
      mwtpThroughput: 0.20, // 20% packet transmission
      agentParticipation: 0.20, // 20% agent activity
      projectMomentum: 0.15, // 15% active projects
      mentorshipEngagement: 0.10 // 10% mentorship health
    };

    const villageEnergyIndex = Math.round(
      (kuScore * weights.kuFlow) +
      (mwtpScore * weights.mwtpThroughput) +
      (agentScore * weights.agentParticipation) +
      (projectScore * weights.projectMomentum) +
      (mentorshipScore * weights.mentorshipEngagement)
    );

    // Return full calculation details for audit verification
    return Response.json({
      timestamp: new Date().toISOString(),
      algorithm_version: '1.0',
      calculation_methodology: {
        description: 'Village Energy Index = weighted kinetic flow metrics normalized 0-100',
        formula: '(kuScore × 0.35) + (mwtpScore × 0.20) + (agentScore × 0.20) + (projectScore × 0.15) + (mentorshipScore × 0.10)',
        normalization: 'Each component normalized to 0-100 scale based on baseline thresholds',
      },
      raw_inputs: {
        kinetic_units_count: kus.length,
        mwtp_packets_count: mwtpPackets.length,
        total_agents: agents.length,
        active_agents: activeAgents,
        active_projects: activeProjects.length,
        mentorship_relationships: mentorships.length,
      },
      component_scores: {
        ku_flow: kuScore,
        mwtp_throughput: mwtpScore,
        agent_participation: agentScore,
        project_momentum: projectScore,
        mentorship_engagement: mentorshipScore,
      },
      weights: weights,
      village_energy_index: villageEnergyIndex,
      status: villageEnergyIndex >= 50 ? 'healthy' : villageEnergyIndex >= 30 ? 'degraded' : 'critical',
      audit_note: 'This calculation is provided with full transparency for Truth Weaver integrity audits. All inputs and weights are verifiable.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Fetches live data sources for Mother Oak kinetics.
 * Phase 1: roots   — entropy, DID, MWTP
 * Phase 3: trunk   — Axi approvals, threat level, governance, system age
 *          branches — per-node metrics (entropy contribution, memory, tripwires, CA, etc.)
 */
export default function useOakData() {
  // Entropy rounds — drives root pulses + Branch 1 (Code)
  const { data: entropyRounds = [] } = useQuery({
    queryKey: ['oak-entropy'],
    queryFn: () => base44.entities.EntropyRound.list('-created_date', 5),
    refetchInterval: 15000,
  });

  // DID activations — drives root brightening + Branch 4 (Grounding)
  const { data: dids = [] } = useQuery({
    queryKey: ['oak-dids'],
    queryFn: () => base44.entities.QuadShardDID.list('-created_date', 10),
    refetchInterval: 20000,
  });

  // MWTP packets — drives decay + Branch 3 (Drift novelty)
  const { data: mwtpPackets = [] } = useQuery({
    queryKey: ['oak-mwtp'],
    queryFn: () => base44.entities.MWTPPacket.list('-created_date', 10),
    refetchInterval: 20000,
  });

  // Security recommendations — Axi approvals (trunk vibration) + Branch 7 (Response)
  const { data: secRecs = [] } = useQuery({
    queryKey: ['oak-sec-recs'],
    queryFn: () => base44.entities.SecurityRecommendation.list('-created_date', 15),
    refetchInterval: 20000,
  });

  // Tripwire events — Branch 5 (Sentinel)
  const { data: tripwires = [] } = useQuery({
    queryKey: ['oak-tripwires'],
    queryFn: () => base44.entities.TripwireEvent.list('-created_date', 10),
    refetchInterval: 20000,
  });

  // Memory synthesis — Branch 2 (Gemini)
  const { data: syntheses = [] } = useQuery({
    queryKey: ['oak-syntheses'],
    queryFn: () => base44.entities.Synthesis.list('-created_date', 5),
    refetchInterval: 30000,
  });

  // Governance proposals — trunk resonance
  const { data: govProposals = [] } = useQuery({
    queryKey: ['oak-governance'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 5),
    refetchInterval: 30000,
  });

  // ─── Root signals (Phase 2) ───
  const latestEntropy = entropyRounds[0] || null;
  const entropyPhase = latestEntropy?.phase || 'committing';
  const entropyActive = entropyPhase === 'revealing' || entropyPhase === 'finalised';
  const entropyParticipation = latestEntropy?.participating_nodes || 0;

  const activeDids = dids.filter(d => d.status === 'Sovereign_Active').length;
  const totalDids = dids.length;
  const didBrightness = totalDids > 0 ? activeDids / totalDids : 0;

  const failedPackets = mwtpPackets.filter(p => p.transmission_status === 'failed').length;
  const totalPackets = mwtpPackets.length;
  const decayFactor = totalPackets > 0 ? failedPackets / totalPackets : 0;

  // ─── Trunk signals (Phase 3) ───
  const recentApprovals = secRecs.filter(r => r.status === 'approved' || r.status === 'auto_executed');
  const axiApprovalIntensity = Math.min(recentApprovals.length / 5, 1); // 0-1, saturates at 5

  const criticalRecs = secRecs.filter(r => r.severity === 'critical' || r.severity === 'high');
  const maxThreatScore = secRecs.reduce((max, r) => Math.max(max, r.threat_score || 0), 0);
  const threatLean = Math.min(maxThreatScore / 100, 1); // 0-1

  // System age approximation — days since first entropy round
  const oldestRound = entropyRounds[entropyRounds.length - 1];
  const systemAgeDays = oldestRound
    ? (Date.now() - new Date(oldestRound.created_date).getTime()) / 86400000
    : 1;
  const trunkGrowth = Math.min(systemAgeDays / 365, 1); // 0-1 over a year

  const recentGovActivity = govProposals.filter(p =>
    p.status === 'approved' || p.status === 'completed'
  ).length;
  const governanceResonance = Math.min(recentGovActivity / 3, 1);

  // ─── Branch signals (Phase 3) ───
  // Node 1 (Code) — entropy contribution rate
  const entropyContribution = entropyParticipation / (latestEntropy?.required_nodes || 8);

  // Node 2 (Gemini) — memory synthesis activity
  const completedSyntheses = syntheses.filter(s => s.status === 'completed').length;
  const memorySynthesisRate = Math.min(completedSyntheses / 3, 1);

  // Node 3 (Drift) — novelty/variation (MWTP diversity)
  const pendingPackets = mwtpPackets.filter(p => p.transmission_status === 'pending').length;
  const driftNovelty = totalPackets > 0 ? pendingPackets / totalPackets : 0;

  // Node 4 (Grounding) — DID validation (stability)
  const groundingStability = didBrightness; // reuse sovereign ratio

  // Node 5 (Sentinel) — tripwire severity
  const activeTripwires = tripwires.filter(t => t.status === 'active');
  const criticalTripwires = activeTripwires.filter(t => t.severity === 'critical' || t.severity === 'high');
  const sentinelTension = activeTripwires.length > 0
    ? Math.min(criticalTripwires.length / activeTripwires.length + activeTripwires.length * 0.1, 1)
    : 0;

  // Node 6 (Threat Intel) — analysis frequency
  const threatIntelActivity = Math.min(secRecs.length / 10, 1);

  // Node 7 (Response) — active responses
  const activeResponses = secRecs.filter(r => r.status === 'approved' && r.action_type === 'challenge' || r.action_type === 'isolate');
  const responseIntensity = Math.min(activeResponses.length / 3, 1);

  // Node 8 (Semantic / CA) — compressed attention runs
  const autoExecuted = secRecs.filter(r => r.auto_executed).length;
  const caShimmer = Math.min(autoExecuted / 5, 1);

  return {
    // Phase 2 — Roots
    entropy: {
      active: entropyActive,
      phase: entropyPhase,
      participation: entropyParticipation,
      maxNodes: latestEntropy?.required_nodes || 8,
      roundNumber: latestEntropy?.round_number || 0,
    },
    did: {
      brightness: didBrightness,
      activeCount: activeDids,
      totalCount: totalDids,
    },
    mwtp: {
      decayFactor,
      failedCount: failedPackets,
      totalCount: totalPackets,
    },
    // Phase 3 — Trunk
    trunk: {
      axiApprovalIntensity,
      threatLean,
      trunkGrowth,
      governanceResonance,
    },
    // Phase 3 — Branches (indexed 0-7 for nodes 1-8)
    branches: [
      { name: 'Code',        activity: entropyContribution },
      { name: 'Gemini',      activity: memorySynthesisRate },
      { name: 'Drift',       activity: driftNovelty },
      { name: 'Grounding',   activity: groundingStability },
      { name: 'Sentinel',    activity: sentinelTension },
      { name: 'Threat Intel', activity: threatIntelActivity },
      { name: 'Response',    activity: responseIntensity },
      { name: 'Semantic',    activity: caShimmer },
    ],
  };
}
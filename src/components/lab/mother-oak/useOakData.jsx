import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Fetches live data sources for Mother Oak kinetics.
 * Each data stream maps to a visual layer of the tree.
 */
export default function useOakData() {
  // Entropy rounds — drives root pulses
  const { data: entropyRounds = [] } = useQuery({
    queryKey: ['oak-entropy'],
    queryFn: () => base44.entities.EntropyRound.list('-created_date', 5),
    refetchInterval: 15000,
  });

  // DID activations — drives root brightening
  const { data: dids = [] } = useQuery({
    queryKey: ['oak-dids'],
    queryFn: () => base44.entities.QuadShardDID.list('-created_date', 10),
    refetchInterval: 20000,
  });

  // MWTP packets — drives decay/composting
  const { data: mwtpPackets = [] } = useQuery({
    queryKey: ['oak-mwtp'],
    queryFn: () => base44.entities.MWTPPacket.list('-created_date', 10),
    refetchInterval: 20000,
  });

  // Derive kinetic signals
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

  return {
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
  };
}
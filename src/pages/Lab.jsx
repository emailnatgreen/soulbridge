import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, FlaskConical, Lock } from 'lucide-react';
import { useIdentity } from '@/hooks/useIdentity';
import NodeStatusGrid from '@/components/lab/NodeStatusGrid';
import RootNote from '@/components/lab/RootNote';
import HonourBoard from '@/components/lab/HonourBoard';
import SkillTreeViewer from '@/components/lab/SkillTreeViewer';
import LoreFeed from '@/components/lab/LoreFeed';
import EntropyProbe from '@/components/lab/EntropyProbe';
import TripwireDashboard from '@/components/lab/TripwireDashboard';
import CompressedAttentionPanel from '@/components/lab/CompressedAttentionPanel';
import SecurityGuardBridge from '@/components/lab/SecurityGuardBridge';
import PilotReadinessDashboard from '@/components/lab/pilot/PilotReadinessDashboard';

function LabContent() {
  const { data: nodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['lab-nodes'],
    queryFn: () => base44.entities.QuadShardDID.list('-created_date', 50),
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['lab-agents'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 50),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['lab-skills'],
    queryFn: () => base44.entities.AgentSkill.list('-level', 200),
  });

  const { data: lore = [] } = useQuery({
    queryKey: ['lab-lore'],
    queryFn: () => base44.entities.Memory.filter({ type: 'observation' }, '-created_date', 30),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              SoulBridge Lab
              <Shield className="w-5 h-5 text-emerald-400" />
            </h1>
            <p className="text-slate-400 text-xs">8-Node Infinite Security System · Logged · Auditable · Reversible</p>
          </div>
        </div>

        <NodeStatusGrid nodes={nodes} loading={nodesLoading} />
        <EntropyProbe />
        <PilotReadinessDashboard />
        <TripwireDashboard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompressedAttentionPanel />
          <SecurityGuardBridge />
        </div>
        <RootNote />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HonourBoard agents={agents} loading={agentsLoading} />
          <SkillTreeViewer skills={skills} agents={agents} />
        </div>

        <LoreFeed entries={lore} />
      </div>
    </div>
  );
}

export default function Lab() {
  const { isAdmin, isLoading: identityLoading } = useIdentity();

  if (identityLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Lock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Access Restricted</h1>
          <p className="text-slate-400 text-sm">The Lab is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return <LabContent />;
}
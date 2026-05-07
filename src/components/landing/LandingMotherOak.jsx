import React, { Suspense, lazy, useState, useEffect } from 'react';
import { TreePine } from 'lucide-react';

const OakTreeScene = lazy(() => import('../lab/mother-oak/OakTreeScene'));

// Lightweight data hook for the public landing — no auth required
// Uses the same entity queries but with graceful failure for public visitors
function useLandingOakData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { base44 } = await import('@/api/base44Client');
        const [entropy, dids, mwtp, secRecs, tripwires, skills, agents] = await Promise.all([
          base44.entities.EntropyRound.list('-created_date', 5).catch(() => []),
          base44.entities.QuadShardDID.list('-created_date', 10).catch(() => []),
          base44.entities.MWTPPacket.list('-created_date', 10).catch(() => []),
          base44.entities.SecurityRecommendation.list('-created_date', 15).catch(() => []),
          base44.entities.TripwireEvent.list('-created_date', 10).catch(() => []),
          base44.entities.AgentSkill.list('-created_date', 60).catch(() => []),
          base44.entities.Agent.list('-honor_score', 20).catch(() => []),
        ]);
        if (cancelled) return;

        const latest = entropy[0] || null;
        const phase = latest?.phase || 'committing';
        const participation = latest?.participating_nodes || 0;
        const maxN = latest?.required_nodes || 8;
        const activeD = dids.filter(d => d.status === 'Sovereign_Active').length;
        const totalD = dids.length;
        const failed = mwtp.filter(p => p.transmission_status === 'failed').length;
        const totalP = mwtp.length;
        const approvals = secRecs.filter(r => r.status === 'approved' || r.status === 'auto_executed');
        const maxThreat = secRecs.reduce((m, r) => Math.max(m, r.threat_score || 0), 0);
        const oldest = entropy[entropy.length - 1];
        const ageDays = oldest ? (Date.now() - new Date(oldest.created_date).getTime()) / 86400000 : 1;
        const activeTW = tripwires.filter(t => t.status === 'active');
        const critTW = activeTW.filter(t => t.severity === 'critical' || t.severity === 'high');

        // Skills → leaves
        const CAT_MAP = { technical: 0, governance: 3, wisdom: 7, creative: 2, resource_management: 5, diplomacy: 1, combat: 4, research: 6, leadership: 3, wellbeing: 1 };
        const skillLeaves = skills.map(sk => ({
          id: sk.id, name: sk.skill_name, category: sk.skill_category,
          level: sk.level || 1, proficiency: sk.proficiency_score || 0,
          isSignature: sk.is_signature_skill || false,
          branchIndex: CAT_MAP[sk.skill_category] ?? Math.floor(Math.random() * 8),
          agentId: sk.agent_id, growth: sk.skill_growth_trajectory || 'stable',
        }));
        const honourMap = {};
        agents.forEach(a => { honourMap[a.id] = a.honor_score || 50; });
        const bMoss = Array(8).fill(0);
        const bCount = Array(8).fill(0);
        skillLeaves.forEach(l => { bMoss[l.branchIndex] += honourMap[l.agentId] || 50; bCount[l.branchIndex]++; });

        setData({
          entropy: { active: phase === 'revealing' || phase === 'finalised', phase, participation, maxNodes: maxN, roundNumber: latest?.round_number || 0 },
          did: { brightness: totalD > 0 ? activeD / totalD : 0, activeCount: activeD, totalCount: totalD },
          mwtp: { decayFactor: totalP > 0 ? failed / totalP : 0, failedCount: failed, totalCount: totalP },
          trunk: {
            axiApprovalIntensity: Math.min(approvals.length / 5, 1),
            threatLean: Math.min(maxThreat / 100, 1),
            trunkGrowth: Math.min(ageDays / 365, 1),
            governanceResonance: 0,
          },
          branches: [
            { name: 'Code', activity: participation / maxN },
            { name: 'Gemini', activity: 0.3 },
            { name: 'Drift', activity: totalP > 0 ? mwtp.filter(p => p.transmission_status === 'pending').length / totalP : 0 },
            { name: 'Grounding', activity: totalD > 0 ? activeD / totalD : 0 },
            { name: 'Sentinel', activity: activeTW.length > 0 ? Math.min(critTW.length / activeTW.length + activeTW.length * 0.1, 1) : 0 },
            { name: 'Threat Intel', activity: Math.min(secRecs.length / 10, 1) },
            { name: 'Response', activity: Math.min(secRecs.filter(r => r.action_type === 'challenge' || r.action_type === 'isolate').length / 3, 1) },
            { name: 'Semantic', activity: Math.min(secRecs.filter(r => r.auto_executed).length / 5, 1) },
          ],
          leaves: { skills: skillLeaves, totalCount: skillLeaves.length },
          memory: {
            entropyRings: entropy.filter(r => r.phase === 'finalised').length,
            didBlooms: activeD,
            scarsActive: critTW.length,
            scarsHealed: tripwires.filter(t => (t.severity === 'critical' || t.severity === 'high') && t.status === 'resolved').length,
            branchMoss: bMoss.map((t, i) => bCount[i] > 0 ? Math.min((t / bCount[i]) / 100, 1) : 0),
            loreCount: 0,
          },
        });
      } catch (e) {
        // Public visitors may not have auth — show static tree
        if (!cancelled) setData(null);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return data;
}

// Static fallback data for when queries fail (unauthenticated visitors)
const STATIC_FALLBACK = {
  entropy: { active: false, phase: 'committing', participation: 0, maxNodes: 8, roundNumber: 0 },
  did: { brightness: 0, activeCount: 0, totalCount: 0 },
  mwtp: { decayFactor: 0, failedCount: 0, totalCount: 0 },
  trunk: { axiApprovalIntensity: 0, threatLean: 0, trunkGrowth: 0.15, governanceResonance: 0 },
  branches: [
    { name: 'Code', activity: 0.1 }, { name: 'Gemini', activity: 0.1 },
    { name: 'Drift', activity: 0.1 }, { name: 'Grounding', activity: 0.1 },
    { name: 'Sentinel', activity: 0.1 }, { name: 'Threat Intel', activity: 0.1 },
    { name: 'Response', activity: 0.1 }, { name: 'Semantic', activity: 0.1 },
  ],
  leaves: { skills: [], totalCount: 0 },
  memory: { entropyRings: 0, didBlooms: 0, scarsActive: 0, scarsHealed: 0, branchMoss: Array(8).fill(0), loreCount: 0 },
};

export default function LandingMotherOak() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const oakData = useLandingOakData();

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Auto-show tree after a brief delay (let hero paint first)
  useEffect(() => {
    const timer = setTimeout(() => setShowTree(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className="text-center py-8">
        <TreePine className="w-16 h-16 text-emerald-400/60 mx-auto mb-3" />
        <p className="text-emerald-300/80 text-sm font-medium">The Mother Oak</p>
        <p className="text-white/40 text-xs mt-1">Node 0 — The Constitutional Root of SoulBridge</p>
        <p className="text-white/25 text-[10px] mt-2">Motion reduced — enable animations to see the living tree</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Label */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5">
          <TreePine className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 text-xs font-medium">The Mother Oak — Node 0</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <p className="text-white/30 text-[10px] mt-1.5">A living, data-driven monument to SoulBridge's constitutional sovereignty</p>
      </div>

      {/* 3D Tree */}
      <div className="rounded-2xl border border-emerald-500/15 bg-slate-950/60 overflow-hidden mx-auto max-w-3xl" style={{ height: '420px' }}>
        {showTree ? (
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <TreePine className="w-8 h-8 text-emerald-400/40 mx-auto mb-2 animate-pulse" />
                  <p className="text-slate-500 text-xs">Growing the Oak…</p>
                </div>
              </div>
            }
          >
            <OakTreeScene kineticData={oakData || STATIC_FALLBACK} />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TreePine className="w-8 h-8 text-emerald-400/40 mx-auto animate-pulse" />
          </div>
        )}
      </div>

      {/* Caption */}
      <p className="text-white/20 text-[9px] text-center mt-2">
        Roots pulse with entropy · Trunk resonates with governance · Branches express each node's heartbeat · Leaves grow with skills · Memory is inscribed forever
      </p>
    </div>
  );
}
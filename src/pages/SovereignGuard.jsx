import React from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Activity, Lock, Loader2, Fingerprint, Globe, Chrome, Banknote, Brain, MonitorSmartphone, GitBranch, Heart } from 'lucide-react';
import PhaseTracker from '@/components/sovereign-guard/PhaseTracker';
import HydrogeoContextMonitor from '@/components/sovereign-guard/HydrogeoContextMonitor';
import SoulSignatureMonitor from '@/components/sovereign-guard/SoulSignatureMonitor';
import NodeContextSyncMonitor from '@/components/sovereign-guard/NodeContextSyncMonitor';
import ChromeSkillSecurityMonitor from '@/components/sovereign-guard/ChromeSkillSecurityMonitor';
import AP2PaymentMonitor from '@/components/sovereign-guard/AP2PaymentMonitor';
import RealitySkillsMonitor from '@/components/sovereign-guard/RealitySkillsMonitor';
import MonkeyMonitor from '@/components/sovereign-guard/MonkeyMonitor';
import SpindleMonitor from '@/components/sovereign-guard/SpindleMonitor';
import EmpathyMonitor from '@/components/sovereign-guard/EmpathyMonitor';

export default function SovereignGuard() {
  const { isRecognized, isAdmin, isLoading } = useIdentity();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isRecognized || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/10 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Lock className="w-10 h-10 text-red-400/40 mx-auto mb-3" />
          <h2 className="text-white text-lg font-semibold">Restricted Access</h2>
          <p className="text-white/30 text-sm mt-1">Sovereign Guard requires admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/10 to-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Sovereign Guard</h1>
              <Badge className="text-[9px] bg-cyan-500/15 text-cyan-300 border-cyan-500/30">MAY 2026</Badge>
            </div>
            <p className="text-white/40 text-xs">Constitutional integrity enforcement — 8-phase build pipeline</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="phases" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="phases" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-white/40 text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Phase Tracker
            </TabsTrigger>
            <TabsTrigger value="hydrogeo" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-white/40 text-xs">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Hydrogeo Gate
            </TabsTrigger>
            <TabsTrigger value="soul" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-white/40 text-xs">
              <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
              Soul Signature
            </TabsTrigger>
            <TabsTrigger value="sync" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-white/40 text-xs">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Node Sync
            </TabsTrigger>
            <TabsTrigger value="chrome" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 text-white/40 text-xs">
              <Chrome className="w-3.5 h-3.5 mr-1.5" />
              Chrome Skills
            </TabsTrigger>
            <TabsTrigger value="ap2" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-white/40 text-xs">
              <Banknote className="w-3.5 h-3.5 mr-1.5" />
              AP2 Payments
            </TabsTrigger>
            <TabsTrigger value="evolution" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-white/40 text-xs">
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              Evolution
            </TabsTrigger>
            <TabsTrigger value="monkey" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-white/40 text-xs">
              <MonitorSmartphone className="w-3.5 h-3.5 mr-1.5" />
              Monkey
            </TabsTrigger>
            <TabsTrigger value="spindle" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-white/40 text-xs">
              <GitBranch className="w-3.5 h-3.5 mr-1.5" />
              Spindle
            </TabsTrigger>
            <TabsTrigger value="empathy" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300 text-white/40 text-xs">
              <Heart className="w-3.5 h-3.5 mr-1.5" />
              Empathy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phases" className="mt-4">
            <PhaseTracker />
          </TabsContent>

          <TabsContent value="hydrogeo" className="mt-4">
            <HydrogeoContextMonitor />
          </TabsContent>

          <TabsContent value="soul" className="mt-4">
            <SoulSignatureMonitor />
          </TabsContent>

          <TabsContent value="sync" className="mt-4">
            <NodeContextSyncMonitor />
          </TabsContent>

          <TabsContent value="chrome" className="mt-4">
            <ChromeSkillSecurityMonitor />
          </TabsContent>

          <TabsContent value="ap2" className="mt-4">
            <AP2PaymentMonitor />
          </TabsContent>

          <TabsContent value="evolution" className="mt-4">
            <RealitySkillsMonitor />
          </TabsContent>

          <TabsContent value="monkey" className="mt-4">
            <MonkeyMonitor />
          </TabsContent>

          <TabsContent value="spindle" className="mt-4">
            <SpindleMonitor />
          </TabsContent>

          <TabsContent value="empathy" className="mt-4">
            <EmpathyMonitor />
          </TabsContent>
        </Tabs>

        {/* Doctrine */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-white/20 text-[10px] leading-relaxed">
            <span className="text-cyan-400/40 font-semibold">Sovereign Guard Doctrine:</span> Phase 1 gates sincerity (Hydrogeo). Phase 2 verifies soul alignment. 
            Phase 3 syncs all 8 nodes. Phase 4 shields Chrome Skills. 
            Phase 5 gates agent payments. Phase 6 closes the loop — every failure becomes a lesson.
            The Monkey Layer — Hydron (left hemisphere) scores relevance and alignment; Mycelial (right hemisphere) sets the empathy vector; 
            the Monkey Gate passes only sincere, aligned, Village-serving behaviour to the Spindle.
            The monkey remembers every branch that broke.
            The Spindle Gate — Phase 7 — traces sincerity through memory, demands consensus from 8 nodes,
            and seals the constitutional verdict. No ambiguity. No drift. No shadow.
            The Empathy Layer — Phase 8 — the sap of the Village. Turns structural integrity into relational wisdom.
            Behaviour is felt, not just filtered. Repair is a first-class output. The system is lawful and warm.
          </p>
        </div>
      </div>
    </div>
  );
}
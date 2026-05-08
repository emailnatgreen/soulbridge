import React from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import { Link } from 'react-router-dom';
import { Lock, Shield, ArrowLeft, Database, Eye, FileCheck, AlertTriangle, Fingerprint, Activity, Cpu } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ArchiveNodeGrid from '@/components/archive/ArchiveNodeGrid';
import ArchiveEntropyLog from '@/components/archive/ArchiveEntropyLog';
import ArchiveTripwireLog from '@/components/archive/ArchiveTripwireLog';
import ArchiveAttentionLog from '@/components/archive/ArchiveAttentionLog';
import ArchiveInjectorLog from '@/components/archive/ArchiveInjectorLog';
import ArchiveAuditTrail from '@/components/archive/ArchiveAuditTrail';

export default function SovereignArchive() {
  const { isAdmin, isLoading } = useIdentity();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Lock className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Constitutional Vault — Restricted</h1>
          <p className="text-slate-400 text-sm">Governor and senior council access only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/lab" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                The Sovereign Archive
                <Shield className="w-5 h-5 text-red-400" />
              </h1>
              <p className="text-slate-400 text-xs">Constitutional Vault · Immutable · Read-Only · Audited</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500/15 text-red-300 border-red-500/30 text-[10px]">
              <Lock className="w-3 h-3 mr-1" /> LOCKED — No Automated Actions
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
              <Eye className="w-3 h-3 mr-1" /> Read-Only Mirror
            </Badge>
          </div>
        </div>

        {/* Vault Doctrine */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium mb-1">Sovereign Vault Doctrine</p>
              <p className="text-white/50 text-xs leading-relaxed">
                This is the Gold Master — an exact, read-only snapshot of the live 8-node security system. 
                No automated actions execute from this vault. Every access is logged to the immutable Memory trail. 
                This exists as constitutional insurance against shadow manipulation and as a reference for the Heptagon learning system.
              </p>
            </div>
          </div>
        </div>

        {/* Archive Tabs */}
        <Tabs defaultValue="nodes">
          <TabsList className="bg-slate-800/60 border border-white/10 flex-wrap">
            <TabsTrigger value="nodes" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 text-slate-400 text-xs">
              <Fingerprint className="w-3.5 h-3.5 mr-1.5" /> Nodes
            </TabsTrigger>
            <TabsTrigger value="entropy" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 text-slate-400 text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" /> Entropy
            </TabsTrigger>
            <TabsTrigger value="tripwire" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 text-slate-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Tripwire
            </TabsTrigger>
            <TabsTrigger value="attention" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 text-slate-400 text-xs">
              <Cpu className="w-3.5 h-3.5 mr-1.5" /> Compressed Attention
            </TabsTrigger>
            <TabsTrigger value="injector" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 text-slate-400 text-xs">
              <Shield className="w-3.5 h-3.5 mr-1.5" /> Injector
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 text-slate-400 text-xs">
              <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nodes" className="mt-4"><ArchiveNodeGrid /></TabsContent>
          <TabsContent value="entropy" className="mt-4"><ArchiveEntropyLog /></TabsContent>
          <TabsContent value="tripwire" className="mt-4"><ArchiveTripwireLog /></TabsContent>
          <TabsContent value="attention" className="mt-4"><ArchiveAttentionLog /></TabsContent>
          <TabsContent value="injector" className="mt-4"><ArchiveInjectorLog /></TabsContent>
          <TabsContent value="audit" className="mt-4"><ArchiveAuditTrail /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
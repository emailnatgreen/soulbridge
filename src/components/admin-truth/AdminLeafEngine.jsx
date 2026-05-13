import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Tag, GitCompare, Link2, Shield, Zap, Sparkles } from 'lucide-react';

const ADMIN_LEAF_CONFIG = [
  { key: 'raw_data', num: 1, icon: Database, label: 'Raw Data', color: 'text-cyan-400', desc: 'Unprocessed input and source material' },
  { key: 'classification', num: 2, icon: Tag, label: 'Classification', color: 'text-blue-400', desc: 'Categorisation and tagging' },
  { key: 'contradictions', num: 3, icon: GitCompare, label: 'Contradictions', color: 'text-amber-400', desc: 'Gaps and conflicting signals' },
  { key: 'cross_links', num: 4, icon: Link2, label: 'Cross-Links', color: 'text-purple-400', desc: 'Connected entities and dependencies' },
  { key: 'risk_impact', num: 5, icon: Shield, label: 'Risk/Impact', color: 'text-red-400', desc: 'Severity and blast radius' },
  { key: 'proposed_actions', num: 6, icon: Zap, label: 'Actions', color: 'text-emerald-400', desc: 'Recommended next steps' },
  { key: 'synthesis', num: 7, icon: Sparkles, label: 'Synthesis', color: 'text-pink-400', desc: 'Final consolidated assessment' },
];

function LeafSection({ leaf, data }) {
  const Icon = leaf.icon;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${leaf.color}`} />
          <span className={`text-xs font-semibold ${leaf.color}`}>Leaf {leaf.num}: {leaf.label}</span>
        </div>
        <p className="text-white/20 text-xs italic">No data collected for this leaf yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${leaf.color}`} />
        <span className={`text-xs font-semibold ${leaf.color}`}>Leaf {leaf.num}: {leaf.label}</span>
        <span className="text-white/20 text-[9px]">{leaf.desc}</span>
      </div>
      {typeof data === 'string' ? (
        <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{data}</p>
      ) : Array.isArray(data) ? (
        <div className="space-y-1.5">
          {data.map((item, i) => (
            <div key={i} className="rounded bg-white/[0.03] border border-white/5 p-2.5 text-xs text-white/60">
              {typeof item === 'string' ? item : (
                <div>
                  {item.title && <p className="text-white/80 font-medium mb-0.5">{item.title}</p>}
                  {item.description && <p className="text-white/50">{item.description}</p>}
                  {item.severity && <Badge className={`text-[8px] mt-1 ${item.severity === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' : item.severity === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{item.severity}</Badge>}
                  {item.status && <Badge className="text-[8px] mt-1 ml-1 bg-white/5 text-white/40 border-white/10">{item.status}</Badge>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <pre className="text-white/50 text-[10px] overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

export default function AdminLeafEngine({ investigation }) {
  const [activeTab, setActiveTab] = useState('all');

  if (!investigation) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
        <Database className="w-8 h-8 text-white/10 mx-auto mb-2" />
        <p className="text-white/20 text-sm">No investigation loaded</p>
        <p className="text-white/10 text-xs mt-1">Run the engine or select from history</p>
      </div>
    );
  }

  const leaves = investigation.leaves || {};

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-1.5">
        {ADMIN_LEAF_CONFIG.map(leaf => {
          const Icon = leaf.icon;
          const hasData = !!leaves[leaf.key] && (typeof leaves[leaf.key] === 'string' ? leaves[leaf.key].length > 0 : Array.isArray(leaves[leaf.key]) ? leaves[leaf.key].length > 0 : true);
          return (
            <Badge key={leaf.num} className={`text-[10px] ${hasData ? `bg-white/5 border-white/10 ${leaf.color}` : 'bg-white/[0.02] border-white/5 text-white/20'}`}>
              <Icon className="w-3 h-3 mr-1" />
              L{leaf.num}
            </Badge>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">All Leaves</TabsTrigger>
          <TabsTrigger value="risks" className="text-xs data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300">Risks Only</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">Actions Only</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-3">
          {ADMIN_LEAF_CONFIG.map(leaf => (
            <LeafSection key={leaf.num} leaf={leaf} data={leaves[leaf.key]} />
          ))}
        </TabsContent>
        <TabsContent value="risks" className="mt-3">
          <LeafSection leaf={ADMIN_LEAF_CONFIG[4]} data={leaves.risk_impact} />
          <div className="mt-3">
            <LeafSection leaf={ADMIN_LEAF_CONFIG[2]} data={leaves.contradictions} />
          </div>
        </TabsContent>
        <TabsContent value="actions" className="mt-3">
          <LeafSection leaf={ADMIN_LEAF_CONFIG[5]} data={leaves.proposed_actions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { ADMIN_LEAF_CONFIG };
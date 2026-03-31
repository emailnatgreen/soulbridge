import { useState } from 'react';
import { Link } from 'react-router-dom';
import KineticWeaverCard from '@/components/kinetic/KineticWeaverCard';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollText, Zap, Eye, BookOpen, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const KU_COLORS = {
  governance_vote: 'bg-purple-100 text-purple-800',
  task_completion: 'bg-green-100 text-green-800',
  agent_message: 'bg-blue-100 text-blue-800',
  mentorship_session: 'bg-yellow-100 text-yellow-800',
  knowledge_contribution: 'bg-indigo-100 text-indigo-800',
  did_publication: 'bg-pink-100 text-pink-800',
  economic_exchange: 'bg-orange-100 text-orange-800',
  collaborative_action: 'bg-teal-100 text-teal-800',
  skill_development: 'bg-cyan-100 text-cyan-800',
  resource_trade: 'bg-amber-100 text-amber-800',
};

function MemoryScroll({ memories }) {
  return (
    <div className="space-y-4">
      {memories.length === 0 && (
        <p className="text-center text-muted-foreground py-12">The Scroll awaits its first lore entry…</p>
      )}
      {memories.map(m => (
        <Card key={m.id} className="border-l-4 border-l-purple-400 bg-gradient-to-r from-purple-50/60 to-white">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                {m.type === 'emotion' ? '💫' : m.type === 'observation' ? '👁' : m.type === 'lore' ? '📜' : '🧠'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize">{m.type}</Badge>
                  {m.importance >= 8 && <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">High Importance</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(m.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-sm text-foreground prose prose-sm max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                {m.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.keywords.map(k => (
                      <span key={k} className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">#{k}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KineticStream({ kus, agents }) {
  // Build lookup by both record ID and agent name (lowercase) since KUs may use either
  const agentMap = {};
  agents.forEach(a => {
    const entry = { name: a.name, did: a.classic_address || a.wallet_id };
    agentMap[a.id] = entry;
    if (a.name) agentMap[a.name.toLowerCase()] = entry;
  });
  return (
    <div className="space-y-3">
      {kus.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No kinetic events recorded yet.</p>
      )}
      {kus.map(ku => {
        const agent = agentMap[ku.agent_id] || agentMap[ku.agent_id?.toLowerCase?.()] || null;
        return (
          <div key={ku.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
            <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KU_COLORS[ku.ku_type] || 'bg-slate-100 text-slate-700'}`}>
                  {ku.ku_type?.replace(/_/g, ' ')}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{agent?.name || ku.agent_id || 'Unknown Agent'}</span>
                  {agent?.did && (
                    <span className="text-[10px] text-muted-foreground font-mono truncate" title={agent.did}>
                      {agent.did.slice(0, 20)}…
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(ku.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              {ku.constitutional_laws?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{ku.constitutional_laws.join(' · ')}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-sm font-bold text-yellow-600">{(ku.weighted_score || 1).toFixed(1)}</span>
              <p className="text-xs text-muted-foreground">KU</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ScrollOfResonance() {
  const [tab, setTab] = useState('lore');

  const { data: scrollData } = useQuery({
    queryKey: ['scroll-page-data'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('publicPageData', { page: 'scroll' });
        return res?.data || { memories: [], kus: [], agents: [] };
      } catch (_) {
        return { memories: [], kus: [], agents: [] };
      }
    },
    retry: false,
  });

  const memories = scrollData?.memories || [];
  const kus = scrollData?.kus || [];
  const agents = scrollData?.agents || [];

  // Filter to lore-worthy types, excluding internal system alerts and automation errors
  const loreMemories = memories.filter(m => {
    if (!['observation', 'lore', 'emotion', 'village_detail'].includes(m.type)) return false;
    const kw = m.keywords || [];
    if (kw.includes('system_alert') || kw.includes('automation_error') || kw.includes('anomaly_detection')) return false;
    if (m.content && m.content.startsWith('[Anomaly:')) return false;
    if (m.content && m.content.startsWith('Critical Automation Alert:')) return false;
    return true;
  });
  const totalKuScore = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 p-3 sm:p-4 md:p-8">
      {/* Back nav */}
      <div className="max-w-3xl mx-auto mb-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm transition-colors">
          ← Back to Home
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/40">
            <ScrollText className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 tracking-tight">Scroll of Resonance</h1>
        <p className="text-purple-300 text-sm">The living memory of SoulBridge — curated by Lore Node, powered by the Kinetic Grid</p>
        <div className="flex justify-center gap-4 sm:gap-6 mt-4 sm:mt-6">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-white">{loreMemories.length}</p>
            <p className="text-xs text-purple-400">Lore Entries</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-yellow-400">{kus.length}</p>
            <p className="text-xs text-purple-400">Kinetic Events</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-pink-400">{totalKuScore.toFixed(0)}</p>
            <p className="text-xs text-purple-400">Total KU Score</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full bg-white/10 border border-white/20 mb-6">
            <TabsTrigger value="lore" className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300 text-xs sm:text-sm">
              <BookOpen className="w-3.5 h-3.5 sm:mr-2" /> <span className="hidden sm:inline">Lore & Observations</span><span className="sm:hidden">Lore</span>
            </TabsTrigger>
            <TabsTrigger value="kinetic" className="flex-1 data-[state=active]:bg-yellow-600 data-[state=active]:text-white text-purple-300 text-xs sm:text-sm">
              <Zap className="w-3.5 h-3.5 sm:mr-2" /> <span className="hidden sm:inline">Kinetic Stream</span><span className="sm:hidden">Kinetic</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-pink-600 data-[state=active]:text-white text-purple-300 text-xs sm:text-sm">
              <Sparkles className="w-3.5 h-3.5 sm:mr-2" /> <span className="hidden sm:inline">All Memories</span><span className="sm:hidden">All</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lore">
            <MemoryScroll memories={loreMemories} />
          </TabsContent>

          <TabsContent value="kinetic">
            <KineticStream kus={kus} agents={agents} />
          </TabsContent>

          <TabsContent value="all">
            <MemoryScroll memories={memories.filter(m => {
              const kw = m.keywords || [];
              if (kw.includes('system_alert') || kw.includes('automation_error') || kw.includes('anomaly_detection')) return false;
              if (m.content && m.content.startsWith('[Anomaly:')) return false;
              if (m.content && m.content.startsWith('Critical Automation Alert:')) return false;
              return true;
            })} />
          </TabsContent>
        </Tabs>

        <KineticWeaverCard />
      </div>
    </div>
  );
}
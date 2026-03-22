import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Brain, Sparkles, Tag, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AgentInsightsPanel({ agent }) {
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['agent-memories', agent.id],
    queryFn: () => base44.entities.Memory.filter({ agent_id: agent.id }, '-created_date', 50),
  });

  // Extract top keywords across all memories
  const keywordCounts = {};
  memories.forEach(m => {
    (m.keywords || []).forEach(kw => {
      if (kw) keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
  });
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kw]) => kw);

  // Memory type distribution
  const typeCounts = {};
  memories.forEach(m => {
    if (m.type) typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
  });

  const handleOpenAxi = () => {
    window.dispatchEvent(new CustomEvent('open-axi-with-message', {
      detail: { message: `Tell me about ${agent.name}'s memory and key insights from their interactions.` }
    }));
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">Agent Insights</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          <span className="text-xs text-white/40">Loading memory data...</span>
        </div>
      ) : (
        <>
          {/* Memory Count */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-500/10 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-light text-purple-300">{memories.length}</p>
              <p className="text-xs text-white/40 mt-0.5">Memories</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-light text-blue-300">{Object.keys(typeCounts).length}</p>
              <p className="text-xs text-white/40 mt-0.5">Types</p>
            </div>
          </div>

          {/* Top Keywords / Themes */}
          {topKeywords.length > 0 && (
            <div>
              <p className="text-xs text-white/30 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Key Themes
              </p>
              <div className="flex flex-wrap gap-1">
                {topKeywords.map(kw => (
                  <span
                    key={kw}
                    className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {memories.length === 0 && (
            <p className="text-xs text-white/30 italic">No memories recorded yet.</p>
          )}

          {/* Navigation Links */}
          <div className="flex flex-col gap-1.5 pt-1">
            <Link
              to={`/MemoryBrowser?agentId=${agent.id}`}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <span className="text-xs text-white/60 group-hover:text-white/90">Jukebox Brain</span>
              <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-purple-400" />
            </Link>
            <Link
              to={`/AxiCommandDashboard?agentId=${agent.id}`}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <span className="text-xs text-white/60 group-hover:text-white/90">Axi Command Dashboard</span>
              <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-purple-400" />
            </Link>
            <button
              onClick={handleOpenAxi}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors group w-full text-left"
            >
              <span className="text-xs text-purple-300 group-hover:text-purple-200">Ask Axi about {agent.name}</span>
              <Sparkles className="w-3 h-3 text-purple-400" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
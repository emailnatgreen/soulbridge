import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Music, Zap, Eye, Heart, Scale, TrendingUp } from 'lucide-react';

const PLAYLISTS = [
  {
    id: 'recent_high_importance',
    name: 'Recent High-Importance Memories',
    icon: Zap,
    description: 'Latest critical insights (importance ≥ 8)',
    color: 'text-yellow-400'
  },
  {
    id: 'sentiment_positive',
    name: 'Positive Sentiment Memories',
    icon: Heart,
    description: 'Constructive and growth-oriented observations',
    color: 'text-green-400'
  },
  {
    id: 'law_mentions',
    name: 'Law & Governance Invocations',
    icon: Scale,
    description: 'Memories referencing SoulBridge Laws',
    color: 'text-indigo-400'
  },
  {
    id: 'anomalies',
    name: 'Anomaly & Alert Memories',
    icon: TrendingUp,
    description: 'System-detected patterns and concerns',
    color: 'text-red-400'
  },
  {
    id: 'agent_insights',
    name: 'Agent Performance Insights',
    icon: Eye,
    description: 'Agent-specific analysis and observations',
    color: 'text-cyan-400'
  },
];

export default function MemoryPlaylistsPanel() {
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memory-playlists'],
    queryFn: () => base44.entities.Memory.list('-importance', 500),
    refetchInterval: 60000, // Refresh every minute
  });

  const filterPlaylist = (playlistId) => {
    switch (playlistId) {
      case 'recent_high_importance':
        return memories.filter(m => (m.importance || 5) >= 8 && m.agent_id !== 'axi')
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
          .slice(0, 10);
      
      case 'sentiment_positive':
        return memories.filter(m => 
          m.context?.includes('positive') || m.context?.includes('growth') || 
          m.context?.includes('success') || m.type === 'achievement'
        ).slice(0, 10);
      
      case 'law_mentions':
        return memories.filter(m => 
          m.context?.match(/Law \d+/) || 
          m.keywords?.some(kw => kw.match(/law|governance|honor|reputation/i))
        ).slice(0, 10);
      
      case 'anomalies':
        return memories.filter(m => 
          m.keywords?.includes('anomaly_detection') ||
          m.keywords?.includes('activity_surge') ||
          m.type === 'observation' && m.importance > 7
        ).slice(0, 10);
      
      case 'agent_insights':
        return memories.filter(m => 
          m.type === 'observation' && m.agent_id === 'axi' &&
          m.keywords?.some(kw => kw.match(/agent|performance|analysis/i))
        ).slice(0, 10);
      
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        Loading memory playlists...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Memory Playlists</h3>
        <span className="text-xs text-slate-500 ml-auto">{memories.length} total memories</span>
      </div>

      <div className="space-y-2">
        {PLAYLISTS.map((playlist) => {
          const Icon = playlist.icon;
          const playlistMemories = filterPlaylist(playlist.id);
          const isExpanded = expandedPlaylist === playlist.id;

          return (
            <Card
              key={playlist.id}
              className="bg-slate-800/50 border-slate-700/40 hover:border-slate-600 transition-all cursor-pointer"
              onClick={() => setExpandedPlaylist(isExpanded ? null : playlist.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${playlist.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{playlist.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{playlist.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {playlistMemories.length}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>

                {isExpanded && playlistMemories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-2">
                    {playlistMemories.map((mem, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-400 bg-slate-900/30 p-2 rounded border border-slate-700/40"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-slate-600">#{idx + 1}</span>
                          <span className="text-slate-300 font-medium">{mem.content.substring(0, 50)}...</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {mem.keywords?.slice(0, 3).map((kw, i) => (
                            <span
                              key={i}
                              className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && playlistMemories.length === 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40 text-xs text-slate-500 italic">
                    No memories in this playlist yet
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/40 mt-4">
        💡 Playlists automatically refresh. Click to explore categorized memory sets.
      </div>
    </div>
  );
}
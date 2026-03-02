import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Medal, Crown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RANK_STYLES = [
  { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' },
  { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
];

export default function TopDiplomatsWidget() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard-top5'],
    queryFn: () => base44.entities.DiplomacyLeaderboardEntry.list('-overall_diplomacy_score', 5),
  });

  const sorted = [...entries].sort((a, b) => (b.overall_diplomacy_score ?? 0) - (a.overall_diplomacy_score ?? 0));

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Top Diplomats
          <Link to={createPageUrl('VillageLeaderboard')} className="ml-auto text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-normal">
            Full Leaderboard <ChevronRight className="w-3 h-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="text-xs text-amber-600 text-center py-4">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="text-xs text-amber-600 text-center py-4">No leaderboard data yet. Complete some reviews!</div>
        ) : (
          sorted.map((entry, idx) => {
            const style = RANK_STYLES[idx] || { icon: Trophy, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' };
            const Icon = style.icon;
            return (
              <div key={entry.id} className={`flex items-center gap-3 p-2 rounded-lg border ${style.bg}`}>
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border shadow-sm">
                  <Icon className={`w-4 h-4 ${style.color}`} />
                </div>
                {entry.agent_avatar_url ? (
                  <img src={entry.agent_avatar_url} alt={entry.agent_name} className="w-7 h-7 rounded-full object-cover border" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {entry.agent_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{entry.agent_name}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{entry.agent_role} · {entry.reviews_completed} reviews</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-700">{entry.overall_diplomacy_score ?? '—'}</p>
                  <p className="text-[10px] text-gray-400">score</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
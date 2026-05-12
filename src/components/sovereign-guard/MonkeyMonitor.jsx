import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Activity, ShieldAlert, TrendingUp, Brain } from 'lucide-react';
import MonkeyLiveFeed from '@/components/monkey/MonkeyLiveFeed';
import MonkeyTrendCharts from '@/components/monkey/MonkeyTrendCharts';
import MonkeyQuarantineList from '@/components/monkey/MonkeyQuarantineList';
import MonkeyStatsGrid from '@/components/monkey/MonkeyStatsGrid';

export default function MonkeyMonitor() {
  const [activeTab, setActiveTab] = useState('feed');

  // Fetch global trends + recent events
  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery({
    queryKey: ['monkey-trends'],
    queryFn: async () => {
      const res = await base44.functions.invoke('monkeyGate', { action: 'trends' });
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Fetch all recent events directly from entity
  const { data: allEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['monkey-events'],
    queryFn: async () => {
      const events = await base44.entities.MonkeyBehaviorEvent.list('-created_date', 50);
      return events;
    },
    refetchInterval: 15000,
  });

  const isLoading = trendsLoading || eventsLoading;

  const handleRefresh = () => {
    refetchTrends();
    refetchEvents();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Brain className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold">Monkey Layer Monitor</h3>
            <p className="text-white/30 text-[10px]">Hydron (Left) + Mycelial (Right) → Gate → Spindle</p>
          </div>
          <Badge className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/30 ml-2">LIVE</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="text-white/40 hover:text-white h-7 px-2"
          disabled={isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Grid */}
      {isLoading && !trends ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400/40" />
        </div>
      ) : (
        <MonkeyStatsGrid trends={trends} />
      )}

      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="feed" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-white/40 text-xs">
            <Activity className="w-3 h-3 mr-1" />
            Live Feed
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-white/40 text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="quarantine" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-white/40 text-xs">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Quarantine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-3">
          <MonkeyLiveFeed events={allEvents || trends?.recent_events || []} />
        </TabsContent>

        <TabsContent value="trends" className="mt-3">
          <MonkeyTrendCharts events={allEvents || trends?.recent_events || []} />
        </TabsContent>

        <TabsContent value="quarantine" className="mt-3">
          <MonkeyQuarantineList events={allEvents || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
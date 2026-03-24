import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';

export default function ResourcesBudgetSection({ project, agents = [] }) {
  const budgetDrops = project.budget_drops || 0;
  const spentDrops = project.spent_drops || 0;
  const remainingDrops = budgetDrops - spentDrops;
  const budgetPercentage = budgetDrops > 0 ? Math.round((spentDrops / budgetDrops) * 100) : 0;

  // Convert drops to XRP (1 XRP = 1,000,000 drops)
  const xrpConvert = (drops) => (drops / 1000000).toFixed(2);

  // Fetch economic activity related to project
  const { data: economicActivity = [] } = useQuery({
    queryKey: ['projectEconomicActivity', project.id],
    queryFn: async () => {
      try {
        // Fetch all economic activity and filter by related project
        const activities = await base44.entities.EconomicActivity.list('-created_date', 100);
        // Filter activities that mention project in description or are from project task payments
        return activities.filter(a => 
          a.description?.toLowerCase().includes(project.title?.toLowerCase()) ||
          a.description?.toLowerCase().includes('task reward') ||
          a.description?.toLowerCase().includes('resource')
        ).slice(0, 8);
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  // Fetch resources linked to project
  const { data: resources = [] } = useQuery({
    queryKey: ['projectResources', project.id],
    queryFn: async () => {
      try {
        const allResources = await base44.entities.Resource.list('-created_date', 50);
        // Simple filter - in a real scenario this would be a proper relation
        return allResources.slice(0, 5);
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  // Resolve agent from activity
  const resolveAgent = (activity) => {
    return agents.find(a => a.id === activity.agent_id) || 
           agents.find(a => a.id === activity.related_agent_id);
  };

  // Budget status color
  const budgetStatus = budgetPercentage >= 90 ? 'text-red-300' : 
                      budgetPercentage >= 75 ? 'text-yellow-300' : 
                      'text-green-300';

  const budgetBarColor = budgetPercentage >= 90 ? 'bg-red-500' : 
                        budgetPercentage >= 75 ? 'bg-yellow-500' : 
                        'bg-green-500';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Resources & Budget</h3>
        </div>
        {budgetPercentage >= 90 && (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
            Budget Caution
          </Badge>
        )}
      </div>

      {/* Budget Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Total Budget</p>
            <p className={`text-lg font-bold ${budgetStatus}`}>{xrpConvert(budgetDrops)} XRP</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-wide">Spent</p>
            <p className="text-lg font-bold text-white">{xrpConvert(spentDrops)} XRP</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-wide">Remaining</p>
            <p className={`text-lg font-bold ${remainingDrops >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {xrpConvert(remainingDrops)} XRP
            </p>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">Budget Utilization</span>
            <span className={`text-xs font-semibold ${budgetStatus}`}>{budgetPercentage}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div
              className={`h-full ${budgetBarColor} transition-all duration-500`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Economic Activity */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <p className="text-white/60 text-xs uppercase tracking-wide">Recent Economic Activity</p>
        </div>

        {economicActivity.length === 0 ? (
          <div className="text-center py-4">
            <AlertCircle className="w-4 h-4 text-white/30 mx-auto mb-1.5" />
            <p className="text-white/40 text-xs">No economic activity recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2 bg-white/5 rounded-lg p-3 border border-white/10">
            {economicActivity.map(activity => {
              const agent = resolveAgent(activity);
              const isInflow = ['earned', 'resource_sold'].includes(activity.activity_type);
              
              return (
                <div key={activity.id} className="flex items-start gap-2.5 pb-2 border-b border-white/10 last:border-0 last:pb-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isInflow ? 'bg-emerald-500/30 text-emerald-300' : 'bg-blue-500/30 text-blue-300'
                  }`}>
                    {isInflow ? '+' : '-'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-xs font-medium">
                        {agent?.name || 'Unknown Agent'}
                      </p>
                      {agent?.classic_address && (
                        <span className="text-[10px] text-white/40 font-mono truncate">
                          {agent.classic_address.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-[10px] mt-0.5 leading-tight">
                      {activity.description}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-mono font-semibold ${isInflow ? 'text-emerald-300' : 'text-white/70'}`}>
                      {isInflow ? '+' : '-'}{xrpConvert(activity.amount)} XRP
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {new Date(activity.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resources Overview */}
      {resources.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-white/60 text-xs uppercase tracking-wide">Project Resources</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {resources.map(resource => (
              <div key={resource.id} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                <p className="text-white text-xs font-medium truncate">{resource.name || 'Resource'}</p>
                {resource.quantity && (
                  <p className="text-white/50 text-[10px] mt-1">Qty: {resource.quantity}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transparency Notice */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2.5 flex items-start gap-2">
        <DollarSign className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-300/80 text-[10px] leading-relaxed">
          All budget allocations and economic transactions are anchored on XRPL with DID identity signals. This ensures transparent stewardship aligned with <span className="font-semibold">Law 3: Fair Share</span> and <span className="font-semibold">Law 6: Exchange</span>.
        </p>
      </div>
    </div>
  );
}
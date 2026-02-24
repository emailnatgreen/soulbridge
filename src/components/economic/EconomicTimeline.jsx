import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Shuffle, Vault } from 'lucide-react';

export default function EconomicTimeline({ economicActivities, agents }) {
  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId.substring(0, 8);
  };

  const activityTypeConfig = {
    earned: { icon: ArrowUpRight, color: 'bg-green-100 text-green-700', label: 'Earned' },
    spent: { icon: ArrowDownLeft, color: 'bg-red-100 text-red-700', label: 'Spent' },
    traded: { icon: Shuffle, color: 'bg-blue-100 text-blue-700', label: 'Traded' },
    treasury_deposit: { icon: Vault, color: 'bg-purple-100 text-purple-700', label: 'Treasury Deposit' },
    treasury_withdrawal: { icon: Vault, color: 'bg-orange-100 text-orange-700', label: 'Treasury Withdrawal' },
    resource_acquired: { icon: ArrowUpRight, color: 'bg-indigo-100 text-indigo-700', label: 'Resource Acquired' },
    resource_sold: { icon: ArrowDownLeft, color: 'bg-amber-100 text-amber-700', label: 'Resource Sold' }
  };

  // Sort by created_date descending
  const sortedActivities = [...economicActivities].sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Economic Timeline</CardTitle>
        <CardDescription>Chronological view of all economic activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedActivities.length === 0 ? (
            <p className="text-slate-500 text-sm">No economic activities recorded</p>
          ) : (
            sortedActivities.map((activity) => {
              const config = activityTypeConfig[activity.activity_type] || {
                icon: Shuffle,
                color: 'bg-slate-100 text-slate-700',
                label: activity.activity_type
              };
              const Icon = config.icon;

              return (
                <div key={activity.id} className="flex gap-4 pb-4 border-b border-slate-200 last:border-b-0">
                  {/* Timeline dot */}
                  <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 mt-1`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{getAgentName(activity.agent_id)}</p>
                        <p className="text-sm text-slate-600">{activity.description}</p>
                        {activity.related_agent_id && (
                          <p className="text-xs text-slate-500 mt-1">
                            ↔ {getAgentName(activity.related_agent_id)}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-slate-900">{activity.amount} XRP</p>
                        <p className="text-xs text-slate-500">
                          {new Date(activity.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
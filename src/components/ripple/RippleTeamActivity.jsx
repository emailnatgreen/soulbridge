import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star, CheckCircle2, Clock, Zap } from 'lucide-react';

const TEAM_MEMBERS = [
  { agent_id: '69a7443f0e474d36cd24cb72', name: 'Ripple Architect', role: 'Creator', contribution: 40 },
  { agent_id: '69a6993e4069ad410198c23f', name: 'Lore Node', role: 'Guardian', contribution: 30 },
  { agent_id: '69a6993e4069ad410198c240', name: 'Code Node', role: 'Creator', contribution: 30 },
];

export default function RippleTeamActivity({ tasks, economicActivity }) {
  const { data: agents = [] } = useQuery({
    queryKey: ['ripple_team_agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const getAgentName = (id) => {
    const found = agents.find(a => a.id === id);
    return found?.name || TEAM_MEMBERS.find(m => m.agent_id === id)?.name || 'Unknown Agent';
  };

  const tasksByAgent = {};
  tasks.forEach(task => {
    const agentId = task.assigned_agent_id || 'unassigned';
    if (!tasksByAgent[agentId]) tasksByAgent[agentId] = [];
    tasksByAgent[agentId].push(task);
  });

  return (
    <div className="space-y-6">
      {/* Team Member Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Project Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TEAM_MEMBERS.map(member => {
            const memberTasks = tasks.filter(t => t.assigned_agent_id === member.agent_id);
            const completedCount = memberTasks.filter(t => t.status === 'completed').length;
            return (
              <Card key={member.agent_id} className="bg-white border-purple-100 hover:border-purple-300 transition-all">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                      <Badge className="text-xs bg-purple-100 text-purple-700">{member.role}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Contribution</span>
                    <span className="font-semibold text-purple-600">{member.contribution}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${member.contribution}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{memberTasks.length} tasks assigned</span>
                    <span className="text-green-600 font-medium">{completedCount} done</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Tasks by Assignment */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            Task Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(tasksByAgent).map(([agentId, agentTasks]) => (
              <div key={agentId}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="w-3 h-3 text-purple-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {agentId === 'unassigned' ? 'Unassigned' : getAgentName(agentId)}
                  </span>
                  <Badge className="text-xs bg-gray-100 text-gray-600">{agentTasks.length} tasks</Badge>
                </div>
                <div className="ml-8 space-y-2">
                  {agentTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        {task.status === 'completed'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          : <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        }
                        <span className={`text-xs ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge className={`text-xs ${task.priority === 'critical' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {task.priority}
                        </Badge>
                        {task.estimated_hours && <span className="text-xs text-gray-400">{task.estimated_hours}h</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Economic Activity by Team */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Team Economic Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {economicActivity.slice(0, 8).map(activity => (
              <div key={activity.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getAgentName(activity.agent_id).charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{getAgentName(activity.agent_id)}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{activity.description}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${activity.activity_type === 'earned' || activity.activity_type === 'treasury_deposit' ? 'text-green-600' : 'text-red-500'}`}>
                  {activity.activity_type === 'spent' || activity.activity_type === 'treasury_withdrawal' ? '-' : '+'}{(activity.amount || 0).toFixed(2)} XRP
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
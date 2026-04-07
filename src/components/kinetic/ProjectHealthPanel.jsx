import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FolderKanban, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const STATUS_COLOR = {
  planning: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  recruiting: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  on_hold: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function ProjectHealthPanel({ projects = [], tasks = [], agents = [] }) {
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  // Task accountability audit — explicit null/undefined checks to avoid falsy-value false positives
  const tasksWithoutDue = tasks.filter(t => t.due_date === null || t.due_date === undefined || t.due_date === '');
  const tasksWithoutReward = tasks.filter(t => (t.reward_drops === null || t.reward_drops === undefined) && t.reward_drops !== 0);
  const overdueTasks = tasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < new Date());
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalRewardDrops = tasks.reduce((s, t) => s + (Number(t.reward_drops) || 0), 0);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-cyan-400" /> Project & Task Health — Live Truth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Accountability warnings */}
        {(tasksWithoutDue.length > 0 || tasksWithoutReward.length > 0 || overdueTasks.length > 0) && (
          <div className="space-y-1.5">
            {tasksWithoutDue.length > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-xs"><strong>{tasksWithoutDue.length}</strong> tasks missing due_date (Law 2 violation)</span>
              </div>
            )}
            {tasksWithoutReward.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-amber-300 text-xs"><strong>{tasksWithoutReward.length}</strong> tasks missing reward_drops (Law 3 violation)</span>
              </div>
            )}
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span className="text-orange-300 text-xs"><strong>{overdueTasks.length}</strong> tasks overdue</span>
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-cyan-300 font-bold text-lg">{projects.length}</p>
            <p className="text-white/40 text-[10px]">Projects</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-purple-300 font-bold text-lg">{tasks.length}</p>
            <p className="text-white/40 text-[10px]">Total Tasks</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-green-300 font-bold text-lg">{completedTasks.length}</p>
            <p className="text-white/40 text-[10px]">Completed</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-amber-300 font-bold text-lg">{(totalRewardDrops / 1000000).toFixed(2)}</p>
            <p className="text-white/40 text-[10px]">XRP Allocated</p>
          </div>
        </div>

        {/* Project list with progress */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {projects.map(p => {
            const owner = agentMap[p.owner_agent_id];
            const pTasks = tasks.filter(t => t.project_id === p.id);
            const pCompleted = pTasks.filter(t => t.status === 'completed').length;
            const pct = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;
            return (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{p.title}</p>
                    <p className="text-white/40 text-[10px]">{owner?.name || 'Unknown'} · {pTasks.length} tasks</p>
                  </div>
                  <Badge className={`text-[10px] flex-shrink-0 ${STATUS_COLOR[p.status] || 'bg-slate-500/20 text-slate-300'}`}>
                    {p.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-white/60 text-[10px] font-mono w-8 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
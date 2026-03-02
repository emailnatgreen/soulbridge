import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Clock, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLOR = {
  pending:     'bg-gray-100 text-gray-700 border-gray-200',
  accepted:    'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed:   'bg-green-100 text-green-700 border-green-200',
  rejected:    'bg-red-100 text-red-700 border-red-200',
  cancelled:   'bg-gray-100 text-gray-400 border-gray-200',
};

const PRIORITY_COLOR = {
  low:      'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function TaskRow({ task, agents }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ status, progress }) =>
      base44.entities.AgentTask.update(task.id, { status, progress_percentage: progress ?? task.progress_percentage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risk-mitigation-tasks'] });
      toast.success('Task updated');
    },
  });

  const assigneeName = agents.find(a => a.id === task.assignee_agent_id)?.name || task.assignee_agent_id || 'Unassigned';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 truncate">{task.title}</span>
            <Badge className={`${STATUS_COLOR[task.status]} border text-xs`}>{task.status.replace('_', ' ')}</Badge>
            <Badge className={`${PRIORITY_COLOR[task.priority]} text-xs`}>{task.priority}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">→ {assigneeName}</span>
            {task.due_date && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {task.due_date}
              </span>
            )}
            <span className="text-xs text-gray-300">
              {formatDistanceToNow(new Date(task.created_date), { addSuffix: true })}
            </span>
          </div>
          {task.progress_percentage > 0 && (
            <Progress value={task.progress_percentage} className="h-1 mt-1.5" />
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-3">
          <p className="text-xs text-gray-600 whitespace-pre-wrap">{task.description}</p>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 font-medium">Update Status:</span>
            <Select
              value={task.status}
              onValueChange={(val) => updateMutation.mutate({ status: val })}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['pending','accepted','in_progress','completed','rejected','cancelled'].map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(task.progress_percentage || 0)}
              onValueChange={(val) => updateMutation.mutate({ status: task.status, progress: Number(val) })}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue placeholder="Progress" />
              </SelectTrigger>
              <SelectContent>
                {[0,10,25,50,75,90,100].map(p => (
                  <SelectItem key={p} value={String(p)} className="text-xs">{p}%</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiskMitigationTasks({ riskId, riskName }) {
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-tasks'],
    queryFn: () => base44.entities.Agent.list('name', 100),
  });

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['risk-mitigation-tasks'],
    queryFn: () => base44.entities.AgentTask.list('-created_date', 200),
    refetchInterval: 10000,
  });

  // Filter tasks that belong to this risk (tagged via related_project_id or title prefix)
  const tasks = allTasks.filter(t =>
    t.related_project_id === riskId ||
    (t.title || '').startsWith('[Risk Mitigation]')
  );

  const open = tasks.filter(t => !['completed','cancelled'].includes(t.status)).length;
  const done = tasks.filter(t => t.status === 'completed').length;

  if (isLoading) return null;
  if (tasks.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
          <CheckSquare className="w-4 h-4 text-blue-600" />
          Mitigation Tasks
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs ml-auto">{open} open · {done} done</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map(t => (
          <TaskRow key={t.id} task={t} agents={agents} />
        ))}
      </CardContent>
    </Card>
  );
}
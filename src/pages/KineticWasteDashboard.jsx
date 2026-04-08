import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Clock, Users, Folder, Zap, TrendingDown, Calendar, ChevronDown, ChevronUp, Bot, Activity, RefreshCw, Filter, Factory, Package, Gauge } from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO, differenceInHours, subHours, subDays } from 'date-fns';

const STALL_DAYS = 7;
const EFFICIENCY_THRESHOLD = 0.8;
const INPUT_SHORTAGE_HOURS = 24;
const RECURRING_THRESHOLD = 3; // same automation errors X+ times
const PERSISTENT_HOURS = 1;    // error unresolved for Y+ hours
const CRITICAL_AUTOMATIONS = ['monitorGovernanceCompliance', 'syncTreasuryBalance', 'lawGuardianScan', 'masterAutomationOrchestrator'];

function automationWasteSignal(log, allLogs) {
  const isoCritical = CRITICAL_AUTOMATIONS.some(n => (log.automation_name || '').toLowerCase().includes(n.toLowerCase()) || (log.function_name || '').toLowerCase().includes(n.toLowerCase()));
  if (isoCritical) return 'Critical System Failure';
  const sameKey = allLogs.filter(l => l.automation_name === log.automation_name && l.function_name === log.function_name && ['error', 'warning'].includes(l.status));
  if (sameKey.length >= RECURRING_THRESHOLD) return `Recurring Error (${sameKey.length}×)`;
  const hours = log.run_at ? differenceInHours(new Date(), new Date(log.run_at)) : 0;
  if (hours >= PERSISTENT_HOURS) return `Persistent Error (${hours}h)`;
  return 'Error';
}

function chainWasteSignal(chain) {
  const eff = chain.efficiency ?? 1;
  if (chain.status === 'insufficient_resources') {
    const hrs = chain.updated_date ? differenceInHours(new Date(), new Date(chain.updated_date)) : 0;
    if (hrs >= INPUT_SHORTAGE_HOURS) return `Stalled: Input Shortage (${hrs}h)`;
    return 'Stalled: Input Shortage';
  }
  if (eff < EFFICIENCY_THRESHOLD) {
    const pct = Math.round(eff * 100);
    if (pct < 50) return `Suboptimal Resource Use (${pct}%)`;
    return `Low Efficiency (${pct}%)`;
  }
  return `Efficiency ${Math.round(eff * 100)}%`;
}

function isInefficient(chain) {
  return (chain.efficiency != null && chain.efficiency < EFFICIENCY_THRESHOLD) || chain.status === 'insufficient_resources';
}

function isStalled(task) {
  const now = new Date();
  const updatedAt = task.updated_date ? new Date(task.updated_date) : null;
  const daysSinceUpdate = updatedAt ? (now - updatedAt) / (1000 * 60 * 60 * 24) : 999;

  if ((task.status === 'blocked') && daysSinceUpdate >= STALL_DAYS) return true;
  if (task.due_date && isPast(parseISO(task.due_date)) && (task.status === 'todo' || task.status === 'in_progress')) return true;
  return false;
}

function stallReason(task) {
  const now = new Date();
  const updatedAt = task.updated_date ? new Date(task.updated_date) : null;
  const daysSinceUpdate = updatedAt ? Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24)) : null;

  if (task.status === 'blocked' && daysSinceUpdate >= STALL_DAYS) return `Blocked for ${daysSinceUpdate} days`;
  if (task.due_date && isPast(parseISO(task.due_date))) return `Overdue since ${formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}`;
  return 'Stalled';
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function BreakdownBar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-sm truncate w-40 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-400 text-sm w-6 text-right">{count}</span>
    </div>
  );
}

export default function KineticWasteDashboard() {
  const [sortBy, setSortBy] = useState('age');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedTask, setExpandedTask] = useState(null);

  const [autoTimeFilter, setAutoTimeFilter] = useState('24h');
  const [autoSortBy, setAutoSortBy] = useState('time');
  const [autoSortAsc, setAutoSortAsc] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [prodSortBy, setProdSortBy] = useState('efficiency');
  const [prodSortAsc, setProdSortAsc] = useState(true);
  const [expandedChain, setExpandedChain] = useState(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks-all'],
    queryFn: () => base44.entities.ProjectTask.list('-updated_date', 200),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-all'],
    queryFn: () => base44.entities.Agent.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['aiprojects-all'],
    queryFn: () => base44.entities.AIProject.list('-created_date', 200),
  });

  const { data: autoLogs = [], isLoading: autoLoading } = useQuery({
    queryKey: ['automation-logs-errors'],
    queryFn: () => base44.entities.AutomationLog.filter({ status: 'error' }, '-run_at', 300).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: warnLogs = [] } = useQuery({
    queryKey: ['automation-logs-warnings'],
    queryFn: () => base44.entities.AutomationLog.filter({ status: 'warning' }, '-run_at', 300).catch(() => []),
  });

  const { data: prodChains = [], isLoading: prodLoading } = useQuery({
    queryKey: ['production-chains-all'],
    queryFn: () => base44.entities.ProductionChain.list('-created_date', 200).catch(() => []),
  });

  const agentMap = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a.name])), [agents]);

  const allErrorLogs = useMemo(() => [...autoLogs, ...warnLogs], [autoLogs, warnLogs]);

  const filteredErrorLogs = useMemo(() => {
    const cutoff = autoTimeFilter === '24h' ? subHours(new Date(), 24) : subDays(new Date(), 7);
    return allErrorLogs.filter(l => l.run_at && new Date(l.run_at) >= cutoff);
  }, [allErrorLogs, autoTimeFilter]);

  const byAutomationName = useMemo(() => {
    const map = {};
    filteredErrorLogs.forEach(l => { const k = l.automation_name || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filteredErrorLogs]);

  const byFunctionName = useMemo(() => {
    const map = {};
    filteredErrorLogs.forEach(l => { const k = l.function_name || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filteredErrorLogs]);

  const uniqueErrorAutomations = useMemo(() => new Set(filteredErrorLogs.map(l => l.automation_name)).size, [filteredErrorLogs]);

  const estimatedDowntimeHours = useMemo(() => {
    const seen = new Set();
    let total = 0;
    filteredErrorLogs.forEach(l => {
      const key = `${l.automation_name}__${l.function_name}`;
      if (!seen.has(key) && l.run_at) {
        seen.add(key);
        total += Math.min(differenceInHours(new Date(), new Date(l.run_at)), 168);
      }
    });
    return total;
  }, [filteredErrorLogs]);

  const errorTypeBreakdown = useMemo(() => {
    const map = { 'API Failure': 0, 'Timeout': 0, 'Parse Error': 0, 'Auth Error': 0, 'Other': 0 };
    filteredErrorLogs.forEach(l => {
      const msg = (l.message || l.error_detail || '').toLowerCase();
      if (msg.includes('timeout') || msg.includes('timed out')) map['Timeout']++;
      else if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('403') || msg.includes('401')) map['Auth Error']++;
      else if (msg.includes('parse') || msg.includes('json') || msg.includes('syntax')) map['Parse Error']++;
      else if (msg.includes('api') || msg.includes('fetch') || msg.includes('network') || msg.includes('500')) map['API Failure']++;
      else map['Other']++;
    });
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [filteredErrorLogs]);

  const sortedErrorLogs = useMemo(() => {
    const arr = [...filteredErrorLogs];
    arr.sort((a, b) => {
      if (autoSortBy === 'time') {
        const av = new Date(a.run_at || 0).getTime(), bv = new Date(b.run_at || 0).getTime();
        return autoSortAsc ? av - bv : bv - av;
      }
      if (autoSortBy === 'name') return autoSortAsc ? (a.automation_name || '').localeCompare(b.automation_name || '') : (b.automation_name || '').localeCompare(a.automation_name || '');
      return 0;
    });
    return arr;
  }, [filteredErrorLogs, autoSortBy, autoSortAsc]);

  const toggleAutoSort = (col) => {
    if (autoSortBy === col) setAutoSortAsc(a => !a);
    else { setAutoSortBy(col); setAutoSortAsc(false); }
  };

  // Production chain memos
  const inefficientChains = useMemo(() => prodChains.filter(isInefficient), [prodChains]);

  const byRecipe = useMemo(() => {
    const map = {};
    inefficientChains.forEach(c => { const k = c.recipe_name || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [inefficientChains]);

  const byChainAgent = useMemo(() => {
    const map = {};
    inefficientChains.forEach(c => { const k = c.agent_id || 'Unassigned'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [inefficientChains]);

  const byOutputResource = useMemo(() => {
    const map = {};
    inefficientChains.forEach(c => { const k = c.output_resource || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [inefficientChains]);

  const resourcesLostDrops = useMemo(() =>
    inefficientChains.reduce((s, c) => s + (c.total_produced || 0) * (1 - (c.efficiency ?? 1)), 0),
  [inefficientChains]);

  const potentialOutputIncrease = useMemo(() =>
    inefficientChains.reduce((s, c) => {
      const eff = c.efficiency ?? 1;
      if (eff > 0) return s + (c.total_produced || 0) * ((1 / eff) - 1);
      return s;
    }, 0),
  [inefficientChains]);

  const mostCommonBottleneck = useMemo(() => {
    const shortage = inefficientChains.filter(c => c.status === 'insufficient_resources').length;
    const lowEff = inefficientChains.filter(c => c.efficiency != null && c.efficiency < 0.5).length;
    if (shortage >= lowEff && shortage > 0) return 'Input Shortage';
    if (lowEff > 0) return 'Process Inefficiency';
    if (inefficientChains.length > 0) return 'Low Efficiency';
    return '—';
  }, [inefficientChains]);

  const sortedChains = useMemo(() => {
    const arr = [...inefficientChains];
    arr.sort((a, b) => {
      if (prodSortBy === 'efficiency') {
        const av = a.efficiency ?? 1, bv = b.efficiency ?? 1;
        return prodSortAsc ? av - bv : bv - av;
      }
      if (prodSortBy === 'output') {
        return prodSortAsc ? (a.total_produced || 0) - (b.total_produced || 0) : (b.total_produced || 0) - (a.total_produced || 0);
      }
      if (prodSortBy === 'name') return prodSortAsc ? (a.recipe_name || '').localeCompare(b.recipe_name || '') : (b.recipe_name || '').localeCompare(a.recipe_name || '');
      return 0;
    });
    return arr;
  }, [inefficientChains, prodSortBy, prodSortAsc]);

  const toggleProdSort = (col) => {
    if (prodSortBy === col) setProdSortAsc(a => !a);
    else { setProdSortBy(col); setProdSortAsc(true); }
  };

  const ProdSortIcon = ({ col }) => prodSortBy === col
    ? (prodSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : null;
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p.title || p.name])), [projects]);

  const stalledTasks = useMemo(() => tasks.filter(isStalled), [tasks]);

  const totalEstimatedHours = useMemo(
    () => stalledTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
    [stalledTasks]
  );

  // Breakdown by project
  const byProject = useMemo(() => {
    const map = {};
    stalledTasks.forEach(t => {
      const key = t.project_id || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [stalledTasks]);

  // Breakdown by agent
  const byAgent = useMemo(() => {
    const map = {};
    stalledTasks.forEach(t => {
      const key = t.assigned_agent_id || 'Unassigned';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [stalledTasks]);

  // Sort stalled tasks for table
  const sortedTasks = useMemo(() => {
    const arr = [...stalledTasks];
    arr.sort((a, b) => {
      let av, bv;
      if (sortBy === 'age') {
        av = new Date(a.updated_date || 0).getTime();
        bv = new Date(b.updated_date || 0).getTime();
        return sortAsc ? av - bv : bv - av;
      }
      if (sortBy === 'hours') {
        av = a.estimated_hours || 0;
        bv = b.estimated_hours || 0;
        return sortAsc ? av - bv : bv - av;
      }
      if (sortBy === 'title') {
        return sortAsc ? (a.title || '').localeCompare(b.title || '') : (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });
    return arr;
  }, [stalledTasks, sortBy, sortAsc]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortAsc(a => !a);
    else { setSortBy(col); setSortAsc(true); }
  };

  const SortIcon = ({ col }) => sortBy === col
    ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : null;

  const statusColor = {
    blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
    todo: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    in_progress: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  const maxProject = byProject[0]?.[1] || 1;
  const maxAgent = byAgent[0]?.[1] || 1;

  const AutoSortIcon = ({ col }) => autoSortBy === col
    ? (autoSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Kinetic Waste Dashboard</h1>
            <p className="text-slate-400 text-sm">Detection & Annihilation of Stalled Kinetic Flow</p>
          </div>
        </div>
        <div className="mt-3 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-red-300 text-sm">
            Stall threshold: <strong>7 days</strong> in blocked status, or any overdue task still in progress
          </span>
        </div>
      </div>

      {tasksLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={AlertTriangle} label="Stalled Tasks" value={stalledTasks.length} color="bg-red-600" />
            <StatCard icon={Clock} label="Hours Locked In Waste" value={`${totalEstimatedHours}h`} color="bg-orange-600" />
            <StatCard icon={Folder} label="Projects Affected" value={byProject.length} color="bg-amber-600" />
            <StatCard icon={Users} label="Agents Affected" value={byAgent.filter(([k]) => k !== 'Unassigned').length} color="bg-rose-600" />
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Folder className="w-4 h-4 text-amber-400" />
                <h2 className="text-white font-semibold">Stalled Tasks by Project</h2>
              </div>
              <div className="space-y-3">
                {byProject.length === 0 && <p className="text-slate-500 text-sm">No stalled tasks detected.</p>}
                {byProject.map(([pid, count]) => (
                  <BreakdownBar
                    key={pid}
                    label={projectMap[pid] || pid}
                    count={count}
                    max={maxProject}
                    color="bg-amber-500"
                  />
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-rose-400" />
                <h2 className="text-white font-semibold">Stalled Tasks by Agent</h2>
              </div>
              <div className="space-y-3">
                {byAgent.length === 0 && <p className="text-slate-500 text-sm">No stalled tasks detected.</p>}
                {byAgent.map(([aid, count]) => (
                  <BreakdownBar
                    key={aid}
                    label={agentMap[aid] || (aid === 'Unassigned' ? 'Unassigned' : aid)}
                    count={count}
                    max={maxAgent}
                    color="bg-rose-500"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stalled Task Table */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-slate-700">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h2 className="text-white font-semibold">Oldest Stalled Tasks</h2>
              <span className="ml-auto text-slate-500 text-xs">{stalledTasks.length} tasks</span>
            </div>

            {stalledTasks.length === 0 ? (
              <div className="p-12 text-center">
                <Zap className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-green-400 font-semibold">No kinetic waste detected</p>
                <p className="text-slate-500 text-sm mt-1">All tasks are flowing — the Grid is clean.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="text-left px-5 py-3 cursor-pointer hover:text-white" onClick={() => toggleSort('title')}>
                        <span className="flex items-center gap-1">Task <SortIcon col="title" /></span>
                      </th>
                      <th className="text-left px-4 py-3">Project</th>
                      <th className="text-left px-4 py-3">Agent</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleSort('hours')}>
                        <span className="flex items-center gap-1">Hours <SortIcon col="hours" /></span>
                      </th>
                      <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleSort('age')}>
                        <span className="flex items-center gap-1">Last Updated <SortIcon col="age" /></span>
                      </th>
                      <th className="text-left px-4 py-3">Waste Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTasks.map(task => (
                      <>
                        <tr
                          key={task.id}
                          className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition"
                          onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        >
                          <td className="px-5 py-3 text-white font-medium max-w-xs truncate">{task.title}</td>
                          <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">{projectMap[task.project_id] || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">{agentMap[task.assigned_agent_id] || 'Unassigned'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor[task.status] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{task.estimated_hours ? `${task.estimated_hours}h` : '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {task.updated_date ? formatDistanceToNow(new Date(task.updated_date), { addSuffix: true }) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-red-400 text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              {stallReason(task)}
                            </span>
                          </td>
                        </tr>
                        {expandedTask === task.id && (
                          <tr key={`${task.id}-exp`} className="bg-slate-800/30">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-500 text-xs mb-1">Description</p>
                                  <p className="text-slate-300">{task.description || 'No description.'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500 text-xs mb-1">Due Date</p>
                                  <p className={`${task.due_date && isPast(parseISO(task.due_date)) ? 'text-red-400' : 'text-slate-300'}`}>
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-500 text-xs mb-1">Blockers</p>
                                  {task.blockers?.length > 0
                                    ? task.blockers.map((b, i) => <p key={i} className="text-amber-300">{b}</p>)
                                    : <p className="text-slate-500">None recorded</p>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── AUTOMATION ERRORS SECTION ── */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Automation Error Waste</h2>
                <p className="text-slate-400 text-sm">Systemic failures consuming resources without delivering value</p>
              </div>
              {/* Time Filter */}
              <div className="ml-auto flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                {['24h', '7d'].map(f => (
                  <button
                    key={f}
                    onClick={() => setAutoTimeFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      autoTimeFilter === f
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >{f === '24h' ? 'Last 24h' : 'Last 7 days'}</button>
                ))}
              </div>
            </div>

            {/* Automation Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Bot} label="Active Error Automations" value={filteredErrorLogs.length} color="bg-fuchsia-700" />
              <StatCard icon={Clock} label="Est. Downtime Hours" value={`${estimatedDowntimeHours}h`} color="bg-violet-700" />
              <StatCard icon={Activity} label="Unique Automations Impacted" value={uniqueErrorAutomations} color="bg-purple-700" />
              <StatCard icon={AlertTriangle} label="Most Common Error" value={errorTypeBreakdown[0]?.[0] || '—'} color="bg-pink-700" />
            </div>

            {/* Error Type + Automation Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <RefreshCw className="w-4 h-4 text-fuchsia-400" />
                  <h3 className="text-white font-semibold">Error Types</h3>
                </div>
                <div className="space-y-3">
                  {errorTypeBreakdown.length === 0 && <p className="text-slate-500 text-sm">No errors detected.</p>}
                  {errorTypeBreakdown.map(([type, count]) => (
                    <BreakdownBar key={type} label={type} count={count} max={errorTypeBreakdown[0]?.[1] || 1} color="bg-fuchsia-500" />
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-violet-400" />
                  <h3 className="text-white font-semibold">By Automation</h3>
                </div>
                <div className="space-y-3">
                  {byAutomationName.length === 0 && <p className="text-slate-500 text-sm">No errors detected.</p>}
                  {byAutomationName.map(([name, count]) => (
                    <BreakdownBar key={name} label={name} count={count} max={byAutomationName[0]?.[1] || 1} color="bg-violet-500" />
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <h3 className="text-white font-semibold">By Function</h3>
                </div>
                <div className="space-y-3">
                  {byFunctionName.length === 0 && <p className="text-slate-500 text-sm">No errors detected.</p>}
                  {byFunctionName.map(([name, count]) => (
                    <BreakdownBar key={name} label={name} count={count} max={byFunctionName[0]?.[1] || 1} color="bg-purple-500" />
                  ))}
                </div>
              </div>
            </div>

            {/* Automation Error Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-5 border-b border-slate-700">
                <Bot className="w-4 h-4 text-fuchsia-400" />
                <h2 className="text-white font-semibold">Automation Error Log</h2>
                <span className="ml-auto text-slate-500 text-xs">{filteredErrorLogs.length} entries</span>
              </div>

              {autoLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-4 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full animate-spin" />
                </div>
              ) : filteredErrorLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <Bot className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold">No automation errors detected</p>
                  <p className="text-slate-500 text-sm mt-1">All automations are running clean.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="text-left px-5 py-3 cursor-pointer hover:text-white" onClick={() => toggleAutoSort('name')}>
                          <span className="flex items-center gap-1">Automation <AutoSortIcon col="name" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Function</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Message</th>
                        <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleAutoSort('time')}>
                          <span className="flex items-center gap-1">Time <AutoSortIcon col="time" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Triggered By</th>
                        <th className="text-left px-4 py-3">Waste Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedErrorLogs.map(log => {
                        const signal = automationWasteSignal(log, allErrorLogs);
                        const isCritical = signal === 'Critical System Failure';
                        return (
                          <>
                            <tr
                              key={log.id}
                              className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition"
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            >
                              <td className="px-5 py-3 text-white font-medium max-w-[160px] truncate">{log.automation_name || '—'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">{log.function_name || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                  log.status === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }`}>{log.status}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{log.message || '—'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">
                                {log.run_at ? formatDistanceToNow(new Date(log.run_at), { addSuffix: true }) : '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[100px]">{log.triggered_by || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 text-xs ${
                                  isCritical ? 'text-red-400' : 'text-fuchsia-400'
                                }`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  {signal}
                                </span>
                              </td>
                            </tr>
                            {expandedLog === log.id && (
                              <tr key={`${log.id}-exp`} className="bg-slate-800/30">
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Full Error Detail</p>
                                      <pre className="text-red-300 text-xs bg-slate-950 rounded p-3 whitespace-pre-wrap break-all max-h-40 overflow-auto">{log.error_detail || log.message || 'No detail available.'}</pre>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Run At</p>
                                      <p className="text-slate-300 text-xs">{log.run_at ? new Date(log.run_at).toLocaleString() : '—'}</p>
                                      <p className="text-slate-500 text-xs mt-3 mb-1">Triggered By</p>
                                      <p className="text-slate-300 text-xs">{log.triggered_by || '—'}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── PRODUCTION CHAIN WASTE SECTION ── */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Production Chain Waste</h2>
                <p className="text-slate-400 text-sm">Inefficient chains consuming excess resources without proportional output</p>
              </div>
              <div className="ml-auto px-3 py-1.5 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                <span className="text-emerald-300 text-xs">Efficiency threshold: <strong>&lt;80%</strong></span>
              </div>
            </div>

            {/* Production Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Factory} label="Inefficient Chains" value={inefficientChains.length} color="bg-emerald-700" />
              <StatCard icon={Package} label="Resources Lost to Waste" value={Math.round(resourcesLostDrops).toLocaleString()} color="bg-teal-700" />
              <StatCard icon={Gauge} label="Potential Output Gain" value={`+${Math.round(potentialOutputIncrease)}`} color="bg-cyan-700" />
              <StatCard icon={AlertTriangle} label="Top Bottleneck" value={mostCommonBottleneck} color="bg-green-800" />
            </div>

            {/* Production Breakdown Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Factory className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-white font-semibold">By Recipe</h3>
                </div>
                <div className="space-y-3">
                  {byRecipe.length === 0 && <p className="text-slate-500 text-sm">No inefficient chains.</p>}
                  {byRecipe.map(([name, count]) => (
                    <BreakdownBar key={name} label={name} count={count} max={byRecipe[0]?.[1] || 1} color="bg-emerald-500" />
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-teal-400" />
                  <h3 className="text-white font-semibold">By Operator Agent</h3>
                </div>
                <div className="space-y-3">
                  {byChainAgent.length === 0 && <p className="text-slate-500 text-sm">No inefficient chains.</p>}
                  {byChainAgent.map(([aid, count]) => (
                    <BreakdownBar key={aid} label={agentMap[aid] || aid} count={count} max={byChainAgent[0]?.[1] || 1} color="bg-teal-500" />
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-white font-semibold">By Output Resource</h3>
                </div>
                <div className="space-y-3">
                  {byOutputResource.length === 0 && <p className="text-slate-500 text-sm">No inefficient chains.</p>}
                  {byOutputResource.map(([res, count]) => (
                    <BreakdownBar key={res} label={res} count={count} max={byOutputResource[0]?.[1] || 1} color="bg-cyan-500" />
                  ))}
                </div>
              </div>
            </div>

            {/* Production Chain Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-5 border-b border-slate-700">
                <Factory className="w-4 h-4 text-emerald-400" />
                <h2 className="text-white font-semibold">Inefficient Production Chains</h2>
                <span className="ml-auto text-slate-500 text-xs">{inefficientChains.length} chains</span>
              </div>

              {prodLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                </div>
              ) : inefficientChains.length === 0 ? (
                <div className="p-12 text-center">
                  <Factory className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold">All production chains are efficient</p>
                  <p className="text-slate-500 text-sm mt-1">Every chain is operating above the 80% threshold.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="text-left px-5 py-3 cursor-pointer hover:text-white" onClick={() => toggleProdSort('name')}>
                          <span className="flex items-center gap-1">Recipe <ProdSortIcon col="name" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Operator</th>
                        <th className="text-left px-4 py-3">Output Resource</th>
                        <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleProdSort('efficiency')}>
                          <span className="flex items-center gap-1">Efficiency <ProdSortIcon col="efficiency" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleProdSort('output')}>
                          <span className="flex items-center gap-1">Total Produced <ProdSortIcon col="output" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Waste Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedChains.map(chain => {
                        const signal = chainWasteSignal(chain);
                        const isShortage = chain.status === 'insufficient_resources';
                        const effPct = chain.efficiency != null ? Math.round(chain.efficiency * 100) : null;
                        return (
                          <>
                            <tr
                              key={chain.id}
                              className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition"
                              onClick={() => setExpandedChain(expandedChain === chain.id ? null : chain.id)}
                            >
                              <td className="px-5 py-3 text-white font-medium max-w-[160px] truncate">{chain.recipe_name || '—'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{agentMap[chain.agent_id] || chain.agent_id || 'Unassigned'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{chain.output_resource || '—'}</td>
                              <td className="px-4 py-3">
                                {effPct != null ? (
                                  <span className={`font-mono text-xs font-bold ${
                                    effPct < 50 ? 'text-red-400' : effPct < 80 ? 'text-amber-400' : 'text-green-400'
                                  }`}>{effPct}%</span>
                                ) : <span className="text-slate-500 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                  isShortage ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }`}>{chain.status || 'unknown'}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-xs">{chain.total_produced ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 text-xs ${
                                  isShortage ? 'text-red-400' : 'text-amber-400'
                                }`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  {signal}
                                </span>
                              </td>
                            </tr>
                            {expandedChain === chain.id && (
                              <tr key={`${chain.id}-exp`} className="bg-slate-800/30">
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Input Resources</p>
                                      <pre className="text-slate-300 text-xs bg-slate-950 rounded p-2 whitespace-pre-wrap">{chain.input_resources ? JSON.stringify(chain.input_resources, null, 2) : 'None recorded'}</pre>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Production Rate</p>
                                      <p className="text-slate-300 text-xs">{chain.production_rate ?? '—'}</p>
                                      <p className="text-slate-500 text-xs mt-3 mb-1">Output Amount</p>
                                      <p className="text-slate-300 text-xs">{chain.output_amount ?? '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Last Updated</p>
                                      <p className="text-slate-300 text-xs">{chain.updated_date ? new Date(chain.updated_date).toLocaleString() : '—'}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
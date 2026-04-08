import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Clock, Users, Folder, Zap, TrendingDown, Calendar, ChevronDown, ChevronUp, Bot, Activity, RefreshCw, Filter, Factory, Package, Gauge, Heart, ShieldAlert, UserX, ShoppingBag, Coins, BarChart2, TrendingUp, BellRing, Flame } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow, isPast, parseISO, differenceInHours, subHours, subDays } from 'date-fns';

const STALL_DAYS = 7;
const EFFICIENCY_THRESHOLD = 0.8;
const INPUT_SHORTAGE_HOURS = 24;
const UNACK_CRITICAL_HOURS = 24;
const PERSISTENT_ALERT_DAYS = 7;
const RECURRING_ALERT_COUNT = 3;

function wellbeingWasteSignal(alert, allAlerts) {
  const ageHours = alert.created_date ? differenceInHours(new Date(), new Date(alert.created_date)) : 0;
  const ageDays = Math.floor(ageHours / 24);
  if (alert.severity === 'critical' && !alert.acknowledged_at && ageHours >= UNACK_CRITICAL_HOURS)
    return `Unacknowledged Critical (${ageHours}h)`;
  if (ageDays >= PERSISTENT_ALERT_DAYS)
    return `Persistent Alert (${ageDays}d)`;
  const recurring = allAlerts.filter(a => a.agent_id === alert.agent_id && a.alert_type === alert.alert_type && a.status === 'active');
  if (recurring.length >= RECURRING_ALERT_COUNT)
    return `Recurring Type (${recurring.length}×)`;
  return alert.severity === 'critical' ? 'Critical Alert' : 'High Alert';
}
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
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [wellSortBy, setWellSortBy] = useState('severity');
  const [wellSortAsc, setWellSortAsc] = useState(true);
  const [expandedRes, setExpandedRes] = useState(null);
  const [resSortBy, setResSortBy] = useState('age');
  const [resSortAsc, setResSortAsc] = useState(true);

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

  const { data: wellbeingAlerts = [], isLoading: wellLoading } = useQuery({
    queryKey: ['wellbeing-alerts-active'],
    queryFn: () => base44.entities.WellbeingAlert.filter({ status: 'active' }, '-created_date', 300).catch(() => []),
    refetchInterval: 60000,
  });

  const { data: resourceListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['resource-listings-all'],
    queryFn: () => base44.entities.ResourceListing.list('-created_date', 300).catch(() => []),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources-all'],
    queryFn: () => base44.entities.Resource.list('-created_date', 300).catch(() => []),
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

  // Wellbeing memos
  const criticalActiveAlerts = useMemo(() => wellbeingAlerts.filter(a => a.severity === 'critical'), [wellbeingAlerts]);
  const highOrCriticalAlerts = useMemo(() => wellbeingAlerts.filter(a => ['high', 'critical'].includes(a.severity)), [wellbeingAlerts]);
  const agentsAtRisk = useMemo(() => new Set(highOrCriticalAlerts.map(a => a.agent_id)).size, [highOrCriticalAlerts]);

  const avgAckHours = useMemo(() => {
    const acked = wellbeingAlerts.filter(a => a.acknowledged_at && a.created_date);
    if (!acked.length) return null;
    const total = acked.reduce((s, a) => s + differenceInHours(new Date(a.acknowledged_at), new Date(a.created_date)), 0);
    return Math.round(total / acked.length);
  }, [wellbeingAlerts]);

  const alertTypeBreakdown = useMemo(() => {
    const map = {};
    highOrCriticalAlerts.forEach(a => { const k = a.alert_type || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [highOrCriticalAlerts]);

  const alertSeverityBreakdown = useMemo(() => {
    const map = {};
    highOrCriticalAlerts.forEach(a => { const k = a.severity || 'unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [highOrCriticalAlerts]);

  const alertByAgent = useMemo(() => {
    const map = {};
    highOrCriticalAlerts.forEach(a => { const k = a.agent_id || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [highOrCriticalAlerts]);

  const sortedWellAlerts = useMemo(() => {
    const severityOrder = { critical: 0, high: 1 };
    const arr = [...highOrCriticalAlerts];
    arr.sort((a, b) => {
      if (wellSortBy === 'severity') {
        const av = severityOrder[a.severity] ?? 2, bv = severityOrder[b.severity] ?? 2;
        return wellSortAsc ? av - bv : bv - av;
      }
      if (wellSortBy === 'age') {
        const av = new Date(a.created_date || 0).getTime(), bv = new Date(b.created_date || 0).getTime();
        return wellSortAsc ? av - bv : bv - av;
      }
      return 0;
    });
    return arr;
  }, [highOrCriticalAlerts, wellSortBy, wellSortAsc]);

  const toggleWellSort = (col) => {
    if (wellSortBy === col) setWellSortAsc(a => !a);
    else { setWellSortBy(col); setWellSortAsc(true); }
  };

  const WellSortIcon = ({ col }) => wellSortBy === col
    ? (wellSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : null;

  // Resource management memos
  const STAGNANT_DAYS = 30;
  const IDLE_DAYS = 60;

  const stagnantListings = useMemo(() => {
    const cutoff = subDays(new Date(), STAGNANT_DAYS);
    return resourceListings.filter(l =>
      (!l.total_sales || l.total_sales === 0) ||
      (l.updated_date && new Date(l.updated_date) < cutoff)
    );
  }, [resourceListings]);

  const idleResources = useMemo(() => {
    const cutoff = subDays(new Date(), IDLE_DAYS);
    return resources.filter(r =>
      r.is_tradeable && r.owner_agent_id &&
      (!r.updated_date || new Date(r.updated_date) < cutoff)
    );
  }, [resources]);

  const unprofitableChains = useMemo(() =>
    prodChains.filter(c => c.efficiency != null && c.efficiency < 0.5),
  [prodChains]);

  const frictionIndex = useMemo(() =>
    stagnantListings.length + idleResources.length + unprofitableChains.length,
  [stagnantListings, idleResources, unprofitableChains]);

  const idleValueTotal = useMemo(() =>
    idleResources.reduce((s, r) => s + (r.xrp_value || 0) * (r.quantity || 1), 0),
  [idleResources]);

  const byResourceType = useMemo(() => {
    const map = {};
    [...stagnantListings, ...idleResources].forEach(r => {
      const k = r.resource_type || r.type || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [stagnantListings, idleResources]);

  const bySellerAgent = useMemo(() => {
    const map = {};
    stagnantListings.forEach(l => { const k = l.seller_agent_id || l.agent_id || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [stagnantListings]);

  const byOwnerAgent = useMemo(() => {
    const map = {};
    idleResources.forEach(r => { const k = r.owner_agent_id || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [idleResources]);

  // Unified resource waste rows
  const resWasteRows = useMemo(() => {
    const rows = [
      ...stagnantListings.map(l => ({
        id: `listing-${l.id}`,
        name: l.resource_name || l.title || 'Listing',
        agent: l.seller_agent_id || l.agent_id,
        quantity: l.quantity_available ?? l.quantity ?? '—',
        price: l.price_per_unit != null ? `${l.price_per_unit} XRP` : '—',
        lastActivity: l.updated_date,
        signal: `Stagnant Listing (${l.total_sales || 0} sales)`,
        type: 'listing',
        raw: l,
      })),
      ...idleResources.map(r => ({
        id: `resource-${r.id}`,
        name: r.name,
        agent: r.owner_agent_id,
        quantity: r.quantity ?? '—',
        price: r.xrp_value != null ? `${r.xrp_value} XRP` : '—',
        lastActivity: r.updated_date,
        signal: `Idle Resource (${r.updated_date ? Math.floor(differenceInHours(new Date(), new Date(r.updated_date)) / 24) : '60'}+ days)`,
        type: 'resource',
        raw: r,
      })),
    ];
    rows.sort((a, b) => {
      if (resSortBy === 'age') {
        const av = new Date(a.lastActivity || 0).getTime(), bv = new Date(b.lastActivity || 0).getTime();
        return resSortAsc ? av - bv : bv - av;
      }
      if (resSortBy === 'name') return resSortAsc ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
      return 0;
    });
    return rows;
  }, [stagnantListings, idleResources, resSortBy, resSortAsc]);

  const toggleResSort = (col) => {
    if (resSortBy === col) setResSortAsc(a => !a);
    else { setResSortBy(col); setResSortAsc(true); }
  };

  const ResSortIcon = ({ col }) => resSortBy === col
    ? (resSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
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

  // ── GLOBAL ACTION ALERTS ──
  const globalAlerts = useMemo(() => {
    const alerts = [];
    const critUnack = criticalActiveAlerts.filter(a => !a.acknowledged_at && a.created_date && differenceInHours(new Date(), new Date(a.created_date)) >= 24);
    if (critUnack.length > 0)
      alerts.push({ level: 'critical', icon: Heart, message: `${critUnack.length} critical wellbeing alert${critUnack.length > 1 ? 's' : ''} unacknowledged for 24h+`, section: 'Wellbeing' });
    const critAuto = filteredErrorLogs.filter(l => CRITICAL_AUTOMATIONS.some(n => (l.automation_name || '').toLowerCase().includes(n.toLowerCase())));
    if (critAuto.length > 0)
      alerts.push({ level: 'critical', icon: Bot, message: `${critAuto.length} critical automation system failure${critAuto.length > 1 ? 's' : ''} detected`, section: 'Automations' });
    const critTasks = stalledTasks.filter(t => t.priority === 'critical');
    if (critTasks.length > 0)
      alerts.push({ level: 'critical', icon: AlertTriangle, message: `${critTasks.length} critical-priority task${critTasks.length > 1 ? 's' : ''} stalled`, section: 'Tasks' });
    const shortageChains = inefficientChains.filter(c => c.status === 'insufficient_resources');
    if (shortageChains.length > 0)
      alerts.push({ level: 'warning', icon: Factory, message: `${shortageChains.length} production chain${shortageChains.length > 1 ? 's' : ''} stalled due to resource shortage`, section: 'Production' });
    if (stagnantListings.length >= 5)
      alerts.push({ level: 'warning', icon: ShoppingBag, message: `${stagnantListings.length} marketplace listings stagnant with zero sales`, section: 'Marketplace' });
    return alerts;
  }, [criticalActiveAlerts, filteredErrorLogs, stalledTasks, inefficientChains, stagnantListings]);

  // ── HISTORICAL WASTE TRENDS ──
  const trendData = useMemo(() => {
    const days = 14;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const label = day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(day); dayEnd.setHours(23,59,59,999);
      const inRange = (d) => d && new Date(d) >= dayStart && new Date(d) <= dayEnd;
      result.push({
        day: label,
        'Stalled Tasks': stalledTasks.filter(t => inRange(t.updated_date)).length,
        'Auto Errors': allErrorLogs.filter(l => inRange(l.run_at)).length,
        'Wellbeing Alerts': wellbeingAlerts.filter(a => inRange(a.created_date)).length,
        'Inefficient Chains': inefficientChains.filter(c => inRange(c.updated_date)).length,
      });
    }
    return result;
  }, [stalledTasks, allErrorLogs, wellbeingAlerts, inefficientChains]);

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

      {/* ── GLOBAL ACTION ALERTS ── */}
      {globalAlerts.length > 0 && (
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <BellRing className="w-4 h-4 text-red-400 animate-pulse" />
            <h2 className="text-white font-semibold text-sm uppercase tracking-widest">Global Action Alerts</h2>
            <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs">{globalAlerts.length} active</span>
          </div>
          {globalAlerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
              a.level === 'critical'
                ? 'bg-red-900/20 border-red-500/40 text-red-300'
                : 'bg-amber-900/20 border-amber-500/40 text-amber-300'
            }`}>
              <a.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm flex-1">{a.message}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                a.level === 'critical' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
              }`}>{a.section}</span>
              {a.level === 'critical' && <Flame className="w-3.5 h-3.5 text-red-500" />}
            </div>
          ))}
        </div>
      )}

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
                      <React.Fragment key={task.id}>
                        <tr
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
                          <tr className="bg-slate-800/30">
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
                      </React.Fragment>
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
                          <React.Fragment key={log.id}>
                            <tr
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
                              <tr className="bg-slate-800/30">
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
                          </React.Fragment>
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
                          <React.Fragment key={chain.id}>
                            <tr
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
                              <tr className="bg-slate-800/30">
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
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── AGENT WELLBEING ALERTS SECTION ── */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Agent Wellbeing Alert Waste</h2>
                <p className="text-slate-400 text-sm">Unaddressed alerts eroding agent capacity and Village Soul</p>
              </div>
              <div className="ml-auto px-3 py-1.5 bg-rose-900/20 border border-rose-500/30 rounded-lg">
                <span className="text-rose-300 text-xs">Showing <strong>high</strong> &amp; <strong>critical</strong> active alerts</span>
              </div>
            </div>

            {/* Wellbeing Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={ShieldAlert} label="Active Critical Alerts" value={criticalActiveAlerts.length} color="bg-rose-700" />
              <StatCard icon={UserX} label="Agents at Risk" value={agentsAtRisk} color="bg-pink-700" />
              <StatCard icon={Clock} label="Avg Time to Acknowledge" value={avgAckHours != null ? `${avgAckHours}h` : '—'} color="bg-red-800" />
              <StatCard icon={AlertTriangle} label="Top Alert Type" value={alertTypeBreakdown[0]?.[0]?.replace(/_/g, ' ') || '—'} color="bg-fuchsia-800" />
            </div>

            {/* Wellbeing Breakdown Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-white font-semibold">By Alert Type</h3>
                </div>
                <div className="space-y-3">
                  {alertTypeBreakdown.length === 0 && <p className="text-slate-500 text-sm">No active alerts.</p>}
                  {alertTypeBreakdown.map(([type, count]) => (
                    <BreakdownBar key={type} label={type.replace(/_/g, ' ')} count={count} max={alertTypeBreakdown[0]?.[1] || 1} color="bg-rose-500" />
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-pink-400" />
                  <h3 className="text-white font-semibold">By Severity</h3>
                </div>
                <div className="space-y-3">
                  {alertSeverityBreakdown.length === 0 && <p className="text-slate-500 text-sm">No active alerts.</p>}
                  {alertSeverityBreakdown.map(([sev, count]) => (
                    <BreakdownBar key={sev} label={sev} count={count} max={alertSeverityBreakdown[0]?.[1] || 1} color={sev === 'critical' ? 'bg-red-600' : 'bg-orange-500'} />
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserX className="w-4 h-4 text-fuchsia-400" />
                  <h3 className="text-white font-semibold">Agents Most Affected</h3>
                </div>
                <div className="space-y-3">
                  {alertByAgent.length === 0 && <p className="text-slate-500 text-sm">No active alerts.</p>}
                  {alertByAgent.map(([aid, count]) => (
                    <BreakdownBar key={aid} label={agentMap[aid] || aid} count={count} max={alertByAgent[0]?.[1] || 1} color="bg-fuchsia-500" />
                  ))}
                </div>
              </div>
            </div>

            {/* Wellbeing Alert Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-5 border-b border-slate-700">
                <Heart className="w-4 h-4 text-rose-400" />
                <h2 className="text-white font-semibold">Unaddressed Wellbeing Alerts</h2>
                <span className="ml-auto text-slate-500 text-xs">{highOrCriticalAlerts.length} alerts</span>
              </div>

              {wellLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-4 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                </div>
              ) : highOrCriticalAlerts.length === 0 ? (
                <div className="p-12 text-center">
                  <Heart className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold">All agents are thriving</p>
                  <p className="text-slate-500 text-sm mt-1">No active high or critical wellbeing alerts.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="text-left px-5 py-3">Agent</th>
                        <th className="text-left px-4 py-3">Alert Type</th>
                        <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleWellSort('severity')}>
                          <span className="flex items-center gap-1">Severity <WellSortIcon col="severity" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Description</th>
                        <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleWellSort('age')}>
                          <span className="flex items-center gap-1">Created <WellSortIcon col="age" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Waste Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedWellAlerts.map(alert => {
                        const signal = wellbeingWasteSignal(alert, wellbeingAlerts);
                        const isCritical = alert.severity === 'critical';
                        return (
                          <React.Fragment key={alert.id}>
                            <tr
                              className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition"
                              onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                            >
                              <td className="px-5 py-3 text-white font-medium">{agentMap[alert.agent_id] || alert.agent_id || '—'}</td>
                              <td className="px-4 py-3 text-slate-300 text-xs">{(alert.alert_type || '—').replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                  isCritical ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                }`}>{alert.severity}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{alert.description || '—'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">
                                {alert.created_date ? formatDistanceToNow(new Date(alert.created_date), { addSuffix: true }) : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 text-xs ${
                                  isCritical ? 'text-red-400' : 'text-rose-400'
                                }`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  {signal}
                                </span>
                              </td>
                            </tr>
                            {expandedAlert === alert.id && (
                              <tr className="bg-slate-800/30">
                                <td colSpan={6} className="px-6 py-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Triggered By</p>
                                      <p className="text-slate-300 text-xs">{alert.triggered_by || '—'}</p>
                                      <p className="text-slate-500 text-xs mt-3 mb-1">Acknowledged At</p>
                                      <p className={`text-xs ${alert.acknowledged_at ? 'text-green-400' : 'text-red-400'}`}>
                                        {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleString() : 'Not yet acknowledged'}
                                      </p>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <p className="text-slate-500 text-xs mb-1">Recommended Interventions</p>
                                      {Array.isArray(alert.recommended_interventions) && alert.recommended_interventions.length > 0
                                        ? <ul className="list-disc list-inside space-y-1">{alert.recommended_interventions.map((r, i) => <li key={i} className="text-amber-300 text-xs">{r}</li>)}</ul>
                                        : <p className="text-slate-500 text-xs">None recorded.</p>}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── RESOURCE MANAGEMENT & MARKETPLACE ANOMALIES SECTION ── */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Resource & Marketplace Waste</h2>
                <p className="text-slate-400 text-sm">Stagnant listings, idle resources, and unprofitable production draining Village economy</p>
              </div>
              <div className="ml-auto px-3 py-1.5 bg-amber-900/20 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                Stagnant &gt;{STAGNANT_DAYS}d &nbsp;·&nbsp; Idle &gt;{IDLE_DAYS}d
              </div>
            </div>

            {/* Resource Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={ShoppingBag} label="Stagnant Listings" value={stagnantListings.length} color="bg-amber-600" />
              <StatCard icon={Coins} label="Idle Resource Value (XRP)" value={idleValueTotal.toFixed(1)} color="bg-yellow-700" />
              <StatCard icon={TrendingDown} label="Unprofitable Chains" value={unprofitableChains.length} color="bg-orange-700" />
              <StatCard icon={BarChart2} label="Friction Index" value={frictionIndex} color="bg-red-900" />
            </div>

            {/* Resource Breakdown Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-amber-400" />
                  <h3 className="text-white font-semibold">By Resource Type</h3>
                </div>
                <div className="space-y-3">
                  {byResourceType.length === 0 && <p className="text-slate-500 text-sm">No waste detected.</p>}
                  {byResourceType.map(([type, count]) => (
                    <BreakdownBar key={type} label={type} count={count} max={byResourceType[0]?.[1] || 1} color="bg-amber-500" />
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-white font-semibold">Stagnant by Seller Agent</h3>
                </div>
                <div className="space-y-3">
                  {bySellerAgent.length === 0 && <p className="text-slate-500 text-sm">No stagnant listings.</p>}
                  {bySellerAgent.map(([aid, count]) => (
                    <BreakdownBar key={aid} label={agentMap[aid] || aid} count={count} max={bySellerAgent[0]?.[1] || 1} color="bg-yellow-600" />
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-4 h-4 text-orange-400" />
                  <h3 className="text-white font-semibold">Idle Resources by Owner</h3>
                </div>
                <div className="space-y-3">
                  {byOwnerAgent.length === 0 && <p className="text-slate-500 text-sm">No idle resources.</p>}
                  {byOwnerAgent.map(([aid, count]) => (
                    <BreakdownBar key={aid} label={agentMap[aid] || aid} count={count} max={byOwnerAgent[0]?.[1] || 1} color="bg-orange-500" />
                  ))}
                </div>
              </div>
            </div>

            {/* Resource Waste Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-5 border-b border-slate-700">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <h2 className="text-white font-semibold">Resource & Listing Waste Log</h2>
                <span className="ml-auto text-slate-500 text-xs">{resWasteRows.length} entries</span>
              </div>

              {listingsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
              ) : resWasteRows.length === 0 ? (
                <div className="p-12 text-center">
                  <TrendingUp className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold">Marketplace is flowing efficiently</p>
                  <p className="text-slate-500 text-sm mt-1">No stagnant listings or idle resources detected.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="text-left px-5 py-3 cursor-pointer hover:text-white" onClick={() => toggleResSort('name')}>
                          <span className="flex items-center gap-1">Resource / Listing <ResSortIcon col="name" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Agent</th>
                        <th className="text-left px-4 py-3">Qty</th>
                        <th className="text-left px-4 py-3">Price / Value</th>
                        <th className="text-left px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleResSort('age')}>
                          <span className="flex items-center gap-1">Last Active <ResSortIcon col="age" /></span>
                        </th>
                        <th className="text-left px-4 py-3">Type</th>
                        <th className="text-left px-4 py-3">Waste Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resWasteRows.map(row => (
                        <React.Fragment key={row.id}>
                          <tr
                            className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition"
                            onClick={() => setExpandedRes(expandedRes === row.id ? null : row.id)}
                          >
                            <td className="px-5 py-3 text-white font-medium max-w-[160px] truncate">{row.name}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{agentMap[row.agent] || row.agent || 'Unknown'}</td>
                            <td className="px-4 py-3 text-slate-300 text-xs">{row.quantity}</td>
                            <td className="px-4 py-3 text-slate-300 text-xs">{row.price}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {row.lastActivity ? formatDistanceToNow(new Date(row.lastActivity), { addSuffix: true }) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                row.type === 'listing'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                              }`}>{row.type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-amber-400 text-xs">
                                <AlertTriangle className="w-3 h-3" />
                                {row.signal}
                              </span>
                            </td>
                          </tr>
                          {expandedRes === row.id && (
                            <tr className="bg-slate-800/30">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                  {Object.entries(row.raw).filter(([k]) => !['id','created_by'].includes(k)).slice(0, 8).map(([k, v]) => (
                                    <div key={k}>
                                      <p className="text-slate-500 mb-0.5">{k.replace(/_/g, ' ')}</p>
                                      <p className="text-slate-300 truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</p>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── HISTORICAL WASTE TRENDS ── */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Historical Waste Trends</h2>
                <p className="text-slate-400 text-sm">14-day daily breakdown of waste signals across all categories</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#cbd5e1' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Line type="monotone" dataKey="Stalled Tasks" stroke="#f87171" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Auto Errors" stroke="#c084fc" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Wellbeing Alerts" stroke="#fb7185" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Inefficient Chains" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Stalled Tasks', color: 'bg-red-400', total: stalledTasks.length },
                  { label: 'Auto Errors', color: 'bg-purple-400', total: filteredErrorLogs.length },
                  { label: 'Wellbeing Alerts', color: 'bg-rose-400', total: highOrCriticalAlerts.length },
                  { label: 'Inefficient Chains', color: 'bg-emerald-400', total: inefficientChains.length },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
                    <div>
                      <p className="text-slate-400 text-xs">{s.label}</p>
                      <p className="text-white font-bold text-sm">{s.total} active</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
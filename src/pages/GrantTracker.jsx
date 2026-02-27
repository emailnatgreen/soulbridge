import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Plus, Calendar, Target, CheckCircle, Clock,
  AlertTriangle, Trophy, FileText, ExternalLink, ChevronDown, ChevronUp, Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { differenceInDays, format, parseISO } from 'date-fns';
import GrantComplianceCheck from '@/components/GrantComplianceCheck';

const STATUS_CONFIG = {
  drafting:   { label: 'Drafting',   color: 'bg-slate-500', icon: FileText },
  in_review:  { label: 'In Review',  color: 'bg-blue-500',  icon: Clock },
  submitted:  { label: 'Submitted',  color: 'bg-indigo-600', icon: CheckCircle },
  follow_up:  { label: 'Follow-up',  color: 'bg-yellow-500', icon: AlertTriangle },
  awarded:    { label: 'Awarded',    color: 'bg-green-600', icon: Trophy },
  rejected:   { label: 'Rejected',  color: 'bg-red-600',   icon: AlertTriangle },
  withdrawn:  { label: 'Withdrawn', color: 'bg-gray-500',  icon: FileText },
};

const PRIORITY_CONFIG = {
  low:      'bg-slate-200 text-slate-700',
  medium:   'bg-yellow-100 text-yellow-800',
  high:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const DEFAULT_XRPL_REQUIREMENTS = [
  { label: 'Business bank account confirmed', completed: false, notes: '' },
  { label: 'Institutional Onboarding Deck prepared', completed: true, notes: 'Live at /InstitutionalDeck' },
  { label: 'DID Document anchored on-chain (XLS-80)', completed: true, notes: 'Active DIDs with DID Documents' },
  { label: 'Verifiable Credentials issued (XLS-70)', completed: true, notes: 'Multiple credential types in production' },
  { label: 'Permissioned Domain deployed', completed: true, notes: 'Credential-gated Village live' },
  { label: 'RLUSD trust lines established', completed: false, notes: '' },
  { label: 'Business registration / incorporation docs', completed: false, notes: '' },
  { label: 'Grant application narrative written', completed: false, notes: '' },
  { label: 'Application submitted online', completed: false, notes: '' },
];

const EMPTY_GRANT = {
  grant_name: '',
  organization: '',
  deadline: '',
  amount_requested: '',
  status: 'drafting',
  priority: 'high',
  description: '',
  requirements: DEFAULT_XRPL_REQUIREMENTS,
  tasks: [],
  notes: '',
  submission_url: '',
  contact_email: '',
};

export default function GrantTracker() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState(null);
  const [form, setForm] = useState(EMPTY_GRANT);
  const [expandedId, setExpandedId] = useState(null);

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ['grants'],
    queryFn: () => base44.entities.GrantApplication.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GrantApplication.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['grants']); setDialogOpen(false); toast.success('Grant added'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GrantApplication.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['grants']); setDialogOpen(false); toast.success('Grant updated'); },
  });

  const openNew = () => {
    setEditingGrant(null);
    setForm({ ...EMPTY_GRANT, requirements: DEFAULT_XRPL_REQUIREMENTS.map(r => ({ ...r })) });
    setDialogOpen(true);
  };

  const openEdit = (grant) => {
    setEditingGrant(grant);
    setForm({ ...grant, amount_requested: grant.amount_requested || '' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = { ...form, amount_requested: form.amount_requested ? Number(form.amount_requested) : undefined };
    if (editingGrant) updateMutation.mutate({ id: editingGrant.id, data });
    else createMutation.mutate(data);
  };

  const toggleRequirement = async (grant, idx) => {
    const requirements = grant.requirements.map((r, i) => i === idx ? { ...r, completed: !r.completed } : r);
    await updateMutation.mutateAsync({ id: grant.id, data: { requirements } });
  };

  const toggleTask = async (grant, idx) => {
    const tasks = grant.tasks.map((t, i) => i === idx ? { ...t, completed: !t.completed } : t);
    await updateMutation.mutateAsync({ id: grant.id, data: { tasks } });
  };

  const daysUntil = (deadline) => {
    try { return differenceInDays(parseISO(deadline), new Date()); } catch { return null; }
  };

  const completionPct = (grant) => {
    const items = [...(grant.requirements || []), ...(grant.tasks || [])];
    if (!items.length) return 0;
    return Math.round(items.filter(i => i.completed).length / items.length * 100);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('InstitutionalDeck')}>
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Deck
            </Button>
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-semibold">Grant Application Tracker</span>
          </div>
        </div>
        <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Grant
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Summary bar */}
        {grants.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {['drafting','submitted','awarded','follow_up'].map(s => {
              const count = grants.filter(g => g.status === s).length;
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className="bg-slate-900 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-xs text-white/50 mt-1">{cfg.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Grant list */}
        {grants.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-4">No grant applications yet</p>
            <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Add First Grant
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {grants.map(grant => {
              const cfg = STATUS_CONFIG[grant.status] || STATUS_CONFIG.drafting;
              const StatusIcon = cfg.icon;
              const days = daysUntil(grant.deadline);
              const pct = completionPct(grant);
              const expanded = expandedId === grant.id;

              return (
                <Card key={grant.id} className="bg-slate-900 border-white/10 text-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <StatusIcon className="w-5 h-5 text-white/60" />
                          {grant.grant_name}
                        </CardTitle>
                        <div className="text-sm text-white/50 mt-1">{grant.organization}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <Badge className={`${cfg.color} text-white border-0 text-xs`}>{cfg.label}</Badge>
                        <Badge variant="outline" className={`${PRIORITY_CONFIG[grant.priority]} border-0 text-xs`}>{grant.priority}</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => openEdit(grant)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setExpandedId(expanded ? null : grant.id)}>
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Progress + deadline row */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-white/40 mb-1">
                          <span>Completion</span><span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {grant.deadline && (
                        <div className={`flex items-center gap-1.5 text-xs shrink-0 ${
                          days !== null && days <= 7 ? 'text-red-400' : days !== null && days <= 21 ? 'text-amber-400' : 'text-white/50'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {days !== null
                            ? days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left`
                            : grant.deadline}
                          {grant.deadline && <span className="text-white/30 ml-1">({format(parseISO(grant.deadline), 'MMM d')})</span>}
                        </div>
                      )}
                      {grant.amount_requested && (
                        <div className="text-xs text-green-400 shrink-0">
                          ${grant.amount_requested.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {expanded && (
                    <CardContent className="pt-0 space-y-5">
                      {grant.description && (
                        <p className="text-sm text-white/60 leading-relaxed">{grant.description}</p>
                      )}

                      {/* Requirements checklist */}
                      {grant.requirements?.length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Requirements</div>
                          <div className="space-y-2">
                            {grant.requirements.map((req, i) => (
                              <div key={i} className="flex items-start gap-3 cursor-pointer group" onClick={() => toggleRequirement(grant, i)}>
                                <div className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${req.completed ? 'bg-green-500 border-green-500' : 'border-white/30 group-hover:border-white/60'}`}>
                                  {req.completed && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                  <div className={`text-sm ${req.completed ? 'line-through text-white/30' : 'text-white/80'}`}>{req.label}</div>
                                  {req.notes && <div className="text-xs text-white/40 mt-0.5">{req.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tasks */}
                      {grant.tasks?.length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Tasks</div>
                          <div className="space-y-2">
                            {grant.tasks.map((task, i) => (
                              <div key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleTask(grant, i)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-white/30 group-hover:border-white/60'}`}>
                                  {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                  <span className={`text-sm ${task.completed ? 'line-through text-white/30' : 'text-white/80'}`}>{task.title}</span>
                                  {task.assigned_to && <span className="text-xs text-white/30 ml-2">→ {task.assigned_to}</span>}
                                </div>
                                {task.due_date && <span className="text-xs text-white/30">{task.due_date}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes & Links */}
                      <div className="flex items-center gap-4 text-xs pt-2 border-t border-white/10">
                        {grant.submission_url && (
                          <a href={grant.submission_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                            <ExternalLink className="w-3 h-3" /> Application Portal
                          </a>
                        )}
                        {grant.contact_email && (
                          <a href={`mailto:${grant.contact_email}`} className="text-white/40 hover:text-white/70">
                            ✉ {grant.contact_email}
                          </a>
                        )}
                        <Link to={createPageUrl('InstitutionalDeck')} className="flex items-center gap-1 text-white/40 hover:text-white/70">
                          <FileText className="w-3 h-3" /> View Deck
                        </Link>
                      </div>

                      {grant.notes && (
                        <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-white/60 border border-white/10">
                          {grant.notes}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGrant ? 'Edit Grant' : 'Add Grant Application'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Grant Name *">
              <input className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.grant_name} onChange={e => setForm(f => ({ ...f, grant_name: e.target.value }))} placeholder="XRPL Spring 2026 Grant" />
            </Field>
            <Field label="Organization *">
              <input className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} placeholder="Ripple / XRPL Foundation" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deadline *">
                <input type="date" className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </Field>
              <Field label="Amount (USD)">
                <input type="number" className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.amount_requested} onChange={e => setForm(f => ({ ...f, amount_requested: e.target.value }))} placeholder="10000" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white h-20 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief summary of grant purpose..." />
            </Field>
            <Field label="Application URL">
              <input className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.submission_url} onChange={e => setForm(f => ({ ...f, submission_url: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="Contact Email">
              <input className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="grants@ripple.com" />
            </Field>
            <Field label="Notes">
              <textarea className="w-full bg-slate-800 border border-white/20 rounded-md px-3 py-2 text-sm text-white h-16 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-white/60" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={!form.grant_name || !form.organization || !form.deadline || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingGrant ? 'Save Changes' : 'Add Grant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-white/50 uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  );
}
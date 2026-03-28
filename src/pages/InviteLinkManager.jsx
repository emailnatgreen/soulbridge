import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus, Copy, Trash2, Check, Clock, Users, Zap, Link2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function generateHash() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateTokenId() {
  return 'SBT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getAppUrl() {
  return window.location.origin;
}

const STATUS_STYLES = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  claimed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  revoked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_ICONS = { active: Check, claimed: Users, revoked: Trash2 };

function CreateTokenForm({ onCreated, currentUser }) {
  const [form, setForm] = useState({
    recipient_nickname: '',
    kinetic_weight: 10,
    usage_type: 'single',
    max_claims: 1,
    auto_expire_hours: '',
    did_binding_address: '',
    notes: '',
  });

  const qc = useQueryClient();

  const { mutate: create, isPending } = useMutation({
    mutationFn: async () => {
      const hash = generateHash();
      const token_id = generateTokenId();
      const expiration_date = form.auto_expire_hours
        ? new Date(Date.now() + Number(form.auto_expire_hours) * 3600000).toISOString()
        : undefined;
      return base44.entities.InvitationToken.create({
        token_id,
        hash,
        status: 'active',
        recipient_nickname: form.recipient_nickname,
        kinetic_weight: Number(form.kinetic_weight),
        usage_type: form.usage_type,
        max_claims: form.usage_type === 'multi' ? Number(form.max_claims) : 1,
        claimed_count: 0,
        auto_expire_hours: form.auto_expire_hours ? Number(form.auto_expire_hours) : undefined,
        expiration_date,
        did_binding_address: form.did_binding_address || undefined,
        notes: form.notes || undefined,
        issued_by: currentUser?.email,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite-tokens'] });
      toast.success('Sovereign Passport issued ✅');
      setForm({ recipient_nickname: '', kinetic_weight: 10, usage_type: 'single', max_claims: 1, auto_expire_hours: '', did_binding_address: '', notes: '' });
      onCreated?.();
    },
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-yellow-400" /> Issue New Invite</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Recipient Nickname *</label>
          <Input className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" placeholder="e.g. Ripple Judge 1" value={form.recipient_nickname} onChange={e => f('recipient_nickname', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Kinetic Weight (KU)</label>
          <Input type="number" className="bg-slate-800 border-slate-600 text-white" value={form.kinetic_weight} onChange={e => f('kinetic_weight', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Usage Type</label>
          <select className="w-full bg-slate-800 border border-slate-600 text-white rounded-md px-3 py-2 text-sm" value={form.usage_type} onChange={e => f('usage_type', e.target.value)}>
            <option value="single">Single Use</option>
            <option value="multi">Multi Use</option>
          </select>
        </div>
        {form.usage_type === 'multi' && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Max Claims</label>
            <Input type="number" className="bg-slate-800 border-slate-600 text-white" value={form.max_claims} onChange={e => f('max_claims', e.target.value)} />
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Auto-Expire</label>
          <select className="w-full bg-slate-800 border border-slate-600 text-white rounded-md px-3 py-2 text-sm" value={form.auto_expire_hours} onChange={e => f('auto_expire_hours', e.target.value)}>
            <option value="">Never</option>
            <option value="1">1 Hour</option>
            <option value="6">6 Hours</option>
            <option value="24">24 Hours</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">DID-Bind (XRPL Address)</label>
          <Input className="bg-slate-800 border-slate-600 text-white placeholder-slate-500 font-mono text-xs" placeholder="rXXX... (optional)" value={form.did_binding_address} onChange={e => f('did_binding_address', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Notes</label>
        <Input className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" placeholder="Internal notes..." value={form.notes} onChange={e => f('notes', e.target.value)} />
      </div>

      <Button onClick={() => create()} disabled={isPending || !form.recipient_nickname} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold w-full sm:w-auto">
        {isPending ? 'Issuing…' : '🛡️ Issue Sovereign Passport'}
      </Button>
    </div>
  );
}

function TokenRow({ token, onRevoke }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${getAppUrl()}/join?token=${token.hash}`;

  const isExpired = token.expiration_date && new Date(token.expiration_date) < new Date();
  const effectiveStatus = isExpired && token.status === 'active' ? 'expired' : token.status;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  const StatusIcon = STATUS_ICONS[token.status] || Check;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white font-mono text-sm font-semibold">{token.token_id || token.hash?.slice(0, 12) + '…'}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-semibold ${STATUS_STYLES[token.status] || STATUS_STYLES.active}`}>
            <StatusIcon className="w-3 h-3" />
            {effectiveStatus === 'expired' ? 'Expired' : token.status.charAt(0).toUpperCase() + token.status.slice(1)}
          </span>
          {token.usage_type === 'multi' && (
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {token.claimed_count || 0}/{token.max_claims} uses
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300">👤 {token.recipient_nickname || '—'}</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" />{token.kinetic_weight ?? 0} KU</span>
          {token.expiration_date && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Expires {new Date(token.expiration_date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
          )}
          {token.did_binding_address && (
            <span className="font-mono text-purple-400 truncate max-w-[120px]" title={token.did_binding_address}>🔗 {token.did_binding_address.slice(0, 12)}…</span>
          )}
        </div>
        {token.notes && <p className="text-xs text-slate-500 italic">{token.notes}</p>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {token.status === 'active' && (
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-xs gap-1" onClick={copyLink}>
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy Link'}
          </Button>
        )}
        {token.status === 'active' && (
          <Button size="sm" variant="outline" className="border-red-800 text-red-400 hover:bg-red-900/30 text-xs gap-1" onClick={() => onRevoke(token)}>
            <Shield className="w-3 h-3" /> Revoke
          </Button>
        )}
        <span className="text-xs text-slate-600 hidden sm:block">{new Date(token.created_date).toLocaleDateString('en-GB')}</span>
      </div>
    </div>
  );
}

export default function InviteLinkManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: tokens = [], isLoading, refetch } = useQuery({
    queryKey: ['invite-tokens'],
    queryFn: () => base44.entities.InvitationToken.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { mutate: revoke } = useMutation({
    mutationFn: (token) => base44.entities.InvitationToken.update(token.id, { status: 'revoked', revoked_by: user?.email }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invite-tokens'] }); toast.success('🛡️ Sentinel Node: Token revoked'); },
  });

  const filtered = filterStatus === 'all' ? tokens : tokens.filter(t => t.status === filterStatus);

  const stats = {
    active: tokens.filter(t => t.status === 'active').length,
    claimed: tokens.filter(t => t.status === 'claimed').length,
    revoked: tokens.filter(t => t.status === 'revoked').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-2xl">🛡️</span> Sentinel Registry
            </h1>
            <p className="text-slate-400 text-sm mt-1">Sovereign Invite Manager · Human Node 06 Command</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:text-white gap-1" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-1" onClick={() => setShowForm(v => !v)}>
              <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Issue Invite'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active', value: stats.active, color: 'text-green-400', icon: '🟢' },
            { label: 'Claimed', value: stats.claimed, color: 'text-blue-400', icon: '🔵' },
            { label: 'Revoked', value: stats.revoked, color: 'text-red-400', icon: '🔴' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.icon} {s.label}</p>
            </div>
          ))}
        </div>

        {/* Create Form */}
        {showForm && <CreateTokenForm currentUser={user} onCreated={() => setShowForm(false)} />}

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'claimed', 'revoked'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${filterStatus === s ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)} {s !== 'all' ? `(${stats[s] ?? 0})` : `(${tokens.length})`}
            </button>
          ))}
        </div>

        {/* Token List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading Sentinel Registry…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No invite links found. Issue a Sovereign Passport to begin.</p>
            </div>
          ) : (
            filtered.map(token => (
              <TokenRow key={token.id} token={token} onRevoke={revoke} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
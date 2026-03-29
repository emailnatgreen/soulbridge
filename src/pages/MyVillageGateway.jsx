import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Sparkles, Plus, Copy, Check, Zap, Users, ArrowRight, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';

function generateHash() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateTokenId() {
  return 'SB-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getAppUrl() {
  return localStorage.getItem('sb_custom_domain') || window.location.origin;
}

function EmptyState({ onActivate }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center">
        <Users className="w-9 h-9 text-purple-300" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-white text-xl font-semibold">Your Gateway Awaits</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          You haven't invited anyone to SoulBridge yet. When you invite someone, they receive a funded testnet wallet and a guided path to publish their own DID — growing the Village under <strong className="text-purple-300">Law 9: Growth</strong>.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-xs">
        {[
          { icon: '🧬', title: 'Law 1: Soul', desc: 'New identities enter the Village' },
          { icon: '🔨', title: 'Law 4: Creation', desc: 'New agents bring new value' },
          { icon: '🌱', title: 'Law 9: Growth', desc: 'The Village expands through trust' },
        ].map(l => (
          <div key={l.title} className="bg-white/5 border border-white/10 rounded-xl p-3 text-left">
            <div className="text-lg mb-1">{l.icon}</div>
            <div className="text-white/70 font-semibold">{l.title}</div>
            <div className="text-white/40">{l.desc}</div>
          </div>
        ))}
      </div>
      <Button
        onClick={onActivate}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2 px-6"
      >
        <Plus className="w-4 h-4" /> Create My First Invite
      </Button>
    </div>
  );
}

function InviteCard({ token }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${getAppUrl()}/?invite=${token.token_id}`;

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite link copied!');
  };

  const statusColor = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    claimed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    revoked: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[token.status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-mono text-sm font-semibold">{token.token_id}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${statusColor}`}>
            {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-white/40">
          <span className="text-white/60">👤 {token.recipient_nickname || '—'}</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" />{token.kinetic_weight ?? 0} KU</span>
          <span>{new Date(token.created_date).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</span>
        </div>
        {token.notes && <p className="text-xs text-white/30 italic">{token.notes}</p>}
      </div>
      {token.status === 'active' && (
        <Button size="sm" variant="outline" className="border-white/20 text-white/60 hover:text-white hover:bg-white/10 text-xs gap-1 flex-shrink-0" onClick={copy}>
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      )}
      {token.status === 'claimed' && (
        <span className="text-xs text-blue-400 flex items-center gap-1 flex-shrink-0"><Check className="w-3 h-3" /> Joined the Village</span>
      )}
    </div>
  );
}

function CreateInviteForm({ userEmail, onDone }) {
  const qc = useQueryClient();
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => base44.entities.InvitationToken.create({
      token_id: generateTokenId(),
      hash: generateHash(),
      status: 'active',
      recipient_nickname: nickname,
      kinetic_weight: 10,
      usage_type: 'single',
      max_claims: 1,
      claimed_count: 0,
      notes: notes || undefined,
      issued_by: userEmail,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-invites'] });
      toast.success('🌱 Invite issued — share the link to grow the Village!');
      setNickname('');
      setNotes('');
      onDone?.();
    },
  });

  return (
    <div className="bg-white/5 border border-purple-500/30 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
        <Plus className="w-4 h-4 text-purple-400" /> Issue a Village Invite
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 mb-1 block">Who are you inviting? *</label>
          <Input
            className="bg-white/5 border-white/20 text-white placeholder-white/20"
            placeholder="e.g. My colleague Sarah"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">Note (optional)</label>
          <Input
            className="bg-white/5 border-white/20 text-white placeholder-white/20"
            placeholder="e.g. Blockchain researcher"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => create()}
          disabled={isPending || !nickname.trim()}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2"
        >
          {isPending ? 'Creating…' : <><Sparkles className="w-4 h-4" /> Issue Invite</>}
        </Button>
        <Button variant="outline" onClick={onDone} className="border-white/20 text-white/50 hover:text-white">
          Cancel
        </Button>
      </div>
      <p className="text-white/25 text-xs">They'll receive a funded testnet wallet + DID onboarding path automatically.</p>
    </div>
  );
}

export default function MyVillageGateway() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: myInvites = [], isLoading } = useQuery({
    queryKey: ['my-invites', user?.email],
    queryFn: () => base44.entities.InvitationToken.filter({ issued_by: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const totalClaimed = myInvites.filter(t => t.status === 'claimed').length;
  const totalActive = myInvites.filter(t => t.status === 'active').length;
  const totalKU = myInvites.filter(t => t.status === 'claimed').reduce((s, t) => s + (t.kinetic_weight || 10), 0);

  const hasInvites = myInvites.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge" className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-white font-semibold text-base leading-tight">My Village Gateway</h1>
              <p className="text-white/30 text-xs">Your personal invite command</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-xs text-white/40 hover:text-white border border-white/15 rounded-lg px-3 py-1.5 transition">
              ← Command
            </Link>
            {hasInvites && !showForm && (
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white gap-1 text-xs" onClick={() => setShowForm(true)}>
                <Plus className="w-3 h-3" /> New Invite
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats — only shown if they have invites */}
        {hasInvites && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active Links', value: totalActive, color: 'text-green-400' },
              { label: 'Villagers Joined', value: totalClaimed, color: 'text-blue-400' },
              { label: 'KU Earned', value: totalKU, color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-white/40 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <CreateInviteForm userEmail={user?.email} onDone={() => setShowForm(false)} />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-purple-400/40 border-t-purple-300 rounded-full animate-spin" />
          </div>
        ) : !hasInvites && !showForm ? (
          <EmptyState onActivate={() => setShowForm(true)} />
        ) : (
          <div className="space-y-3">
            <h2 className="text-white/60 text-xs uppercase tracking-widest">Your Invites ({myInvites.length})</h2>
            {myInvites.map(t => <InviteCard key={t.id} token={t} />)}
          </div>
        )}

        {/* Footer nudge */}
        {hasInvites && (
          <div className="text-center pt-4 border-t border-white/5">
            <p className="text-white/20 text-xs">
              Each person you invite receives a funded wallet and DID onboarding.
              Their journey honours <span className="text-purple-400">Law 9: Growth</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
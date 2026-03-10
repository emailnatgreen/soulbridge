import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Calendar, Award, Eye, EyeOff, Copy, Download, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

const CREDENTIAL_COLORS = {
  skill_certification: { bg: 'bg-blue-900/20 border-blue-500/30', text: 'text-blue-400' },
  achievement: { bg: 'bg-purple-900/20 border-purple-500/30', text: 'text-purple-400' },
  professional_license: { bg: 'bg-indigo-900/20 border-indigo-500/30', text: 'text-indigo-400' },
  educational_degree: { bg: 'bg-cyan-900/20 border-cyan-500/30', text: 'text-cyan-400' },
  membership: { bg: 'bg-teal-900/20 border-teal-500/30', text: 'text-teal-400' },
  authorization: { bg: 'bg-emerald-900/20 border-emerald-500/30', text: 'text-emerald-400' },
  compliance_attestation: { bg: 'bg-amber-900/20 border-amber-500/30', text: 'text-amber-400' },
  identity_verified: { bg: 'bg-green-900/20 border-green-500/30', text: 'text-green-400' },
};

function CredentialCard({ cred, onRevoke, onViewDetails }) {
  const colors = CREDENTIAL_COLORS[cred.credential_type] || CREDENTIAL_COLORS.achievement;
  const isExpired = cred.expiration_date && new Date(cred.expiration_date) < new Date();
  const isRevoked = cred.status === 'revoked';

  return (
    <div className={`border rounded-lg p-4 space-y-3 transition-all ${colors.bg} ${isExpired || isRevoked ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Award className={`w-5 h-5 mt-0.5 shrink-0 ${colors.text}`} />
          <div className="min-w-0">
            <div className="font-semibold text-sm">{cred.credential_name}</div>
            <div className="text-xs text-white/40 mt-0.5">{cred.credential_type.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <Badge
          className={`shrink-0 text-xs border-0 ${
            isRevoked ? 'bg-red-600' : isExpired ? 'bg-orange-600' : cred.status === 'active' ? 'bg-green-600' : 'bg-slate-600'
          }`}
        >
          {isRevoked ? 'Revoked' : isExpired ? 'Expired' : cred.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {cred.issuance_date && (
          <div className="flex items-center gap-1 text-white/50">
            <Calendar className="w-3 h-3" />
            Issued {formatDistanceToNow(new Date(cred.issuance_date), { addSuffix: true })}
          </div>
        )}
        {cred.expiration_date && (
          <div className="flex items-center gap-1 text-white/50">
            <Calendar className="w-3 h-3" />
            Expires {format(new Date(cred.expiration_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>

      {cred.is_verified && (
        <div className="flex items-center gap-1 text-xs text-green-400">
          <Shield className="w-3 h-3" />
          Verified ({cred.verification_count || 0} verification{(cred.verification_count || 0) !== 1 ? 's' : ''})
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/10">
        <Button size="sm" variant="ghost" onClick={() => onViewDetails(cred)} className="text-white/50 hover:text-white text-xs flex-1">
          View Details
        </Button>
        {cred.status === 'active' && !isExpired && (
          <Button size="sm" variant="ghost" onClick={() => onRevoke(cred.id)} className="text-red-400 hover:bg-red-900/20 text-xs">
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

function CredentialDetails({ cred, open, onOpenChange }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-white/20 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{cred?.credential_name || 'Credential Details'}</DialogTitle>
        </DialogHeader>
        {cred && (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-white/50 mb-1">Credential Type</div>
            <Badge className="bg-indigo-600">{cred.credential_type.replace(/_/g, ' ')}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/50 mb-1">Issuer</div>
              <code className="text-xs text-white/70 break-all">{cred.issuer_did}</code>
            </div>
            <div>
              <div className="text-white/50 mb-1">Subject</div>
              <code className="text-xs text-white/70 break-all">{cred.subject_did}</code>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/50 mb-1">Issued</div>
              <div className="text-white/80">{format(new Date(cred.issuance_date), 'PPP p')}</div>
            </div>
            {cred.expiration_date && (
              <div>
                <div className="text-white/50 mb-1">Expires</div>
                <div className="text-white/80">{format(new Date(cred.expiration_date), 'PPP p')}</div>
              </div>
            )}
          </div>

          {cred.credential_data && Object.keys(cred.credential_data).length > 0 && (
            <div>
              <div className="text-white/50 mb-2">Credential Data</div>
              <pre className="bg-slate-800 p-3 rounded-lg text-xs overflow-x-auto text-green-300">
                {JSON.stringify(cred.credential_data, null, 2)}
              </pre>
            </div>
          )}

          {cred.proof && (
            <div>
              <div className="text-white/50 mb-2">Cryptographic Proof</div>
              <div className="bg-slate-800 p-3 rounded-lg space-y-2 text-xs">
                <div>
                  <div className="text-white/40 mb-1">Type</div>
                  <div className="text-white/70">{cred.proof.type}</div>
                </div>
                <div>
                  <div className="text-white/40 mb-1">Verification Method</div>
                  <code className="text-white/60 break-all block text-xs">{cred.proof.verification_method}</code>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(cred.proof.proof_value)}
                    className="text-white/50 hover:text-white text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Signature
                  </Button>
                </div>
              </div>
            </div>
          )}
          </div>
          )}
          </DialogContent>
    </Dialog>
  );
}

export default function CredentialWallet() {
  const [filter, setFilter] = useState('active');
  const [selectedCred, setSelectedCred] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: credentials = [] } = useQuery({
    queryKey: ['didCredentials'],
    queryFn: () => base44.entities.DidCredential.filter({}, '-created_date', 100),
  });

  const revokeMutation = useMutation({
    mutationFn: (credId) => base44.entities.DidCredential.update(credId, { status: 'revoked', revoked_at: new Date().toISOString() }),
    onSuccess: () => {
      toast.success('Credential revoked');
      queryClient.invalidateQueries({ queryKey: ['didCredentials'] });
    },
  });

  const filterMap = {
    active: (c) => c.status === 'active' && (!c.expiration_date || new Date(c.expiration_date) >= new Date()),
    received: (c) => c.status === 'active',
    revoked: (c) => c.status === 'revoked',
    all: () => true,
  };

  const filtered = credentials.filter(filterMap[filter] || (() => true));
  const stats = {
    active: credentials.filter(c => c.status === 'active' && (!c.expiration_date || new Date(c.expiration_date) >= new Date())).length,
    revoked: credentials.filter(c => c.status === 'revoked').length,
    expired: credentials.filter(c => c.expiration_date && new Date(c.expiration_date) < new Date()).length,
  };

  return (
    <>
      <div className="bg-slate-800/40 border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-sm">Credential Wallet</span>
          </div>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setFilter('active')} className={`px-3 py-1 rounded-full border transition-colors ${filter === 'active' ? 'bg-green-600/30 border-green-500 text-green-300' : 'border-white/10 text-white/50 hover:text-white'}`}>
              Active ({stats.active})
            </button>
            <button onClick={() => setFilter('revoked')} className={`px-3 py-1 rounded-full border transition-colors ${filter === 'revoked' ? 'bg-red-600/30 border-red-500 text-red-300' : 'border-white/10 text-white/50 hover:text-white'}`}>
              Revoked ({stats.revoked})
            </button>
            <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full border transition-colors ${filter === 'all' ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'border-white/10 text-white/50 hover:text-white'}`}>
              All ({credentials.length})
            </button>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No {filter === 'all' ? '' : filter} credentials yet
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map(cred => (
                <CredentialCard
                  key={cred.id}
                  cred={cred}
                  onRevoke={(id) => revokeMutation.mutate(id)}
                  onViewDetails={(c) => {
                    setSelectedCred(c);
                    setDetailsOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedCred && (
        <CredentialDetails cred={selectedCred} open={detailsOpen} onOpenChange={setDetailsOpen} />
      )}
    </>
  );
}
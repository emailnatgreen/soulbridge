import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Lock, ShieldCheck, ShieldOff, ChevronDown, ChevronUp, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { computeSovereignIdentity, verifyIdentity } from '@/lib/sovereignIdentity';

function CopyableHash({ hash, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-400 text-[9px] w-20 flex-shrink-0">{label}:</span>
      <span className="text-violet-300 font-mono text-[9px] break-all flex-1">{hash}</span>
      <button onClick={handleCopy} className="text-slate-400 hover:text-slate-200 flex-shrink-0">
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

function BoundaryRule({ label, items, type }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex items-start gap-2 text-[9px]">
      {type === 'allow'
        ? <ShieldCheck className="w-3 h-3 text-emerald-400/60 mt-0.5 flex-shrink-0" />
        : <ShieldOff className="w-3 h-3 text-red-400/60 mt-0.5 flex-shrink-0" />
      }
      <div>
        <span className="text-slate-400">{label}: </span>
        <span className={type === 'allow' ? 'text-emerald-300' : 'text-red-300'}>
          {items.join(', ')}
        </span>
      </div>
    </div>
  );
}

export default function SovereignIdentityPanel() {
  const [identity, setIdentity] = useState(null);
  const [verified, setVerified] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await computeSovereignIdentity();
      setIdentity(id);
      const ok = await verifyIdentity(id.identity_hash);
      setVerified(ok);
    })();
  }, []);

  if (!identity) {
    return (
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-32" />
      </div>
    );
  }

  const ps = identity.public_surface;
  const br = identity.boundary_rules;

  return (
    <Card className="bg-violet-950/30 border-violet-500/30">
      <CardHeader className="pb-1.5 pt-3 px-3">
        <CardTitle className="text-[10px] flex items-center gap-1.5">
          <Fingerprint className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-violet-300 font-semibold uppercase tracking-wider">Sovereign Identity</span>
          <Badge className={`text-[7px] ml-auto ${verified ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
            {verified ? 'VERIFIED' : 'TAMPERED'}
          </Badge>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-200 ml-1">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Public surface — always visible */}
        <div className="flex items-center gap-2">
          <div className="bg-violet-500/10 rounded px-2 py-1">
            <span className="text-violet-300 font-mono text-[11px] font-bold tracking-wider">{ps.public_fingerprint}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-[10px] font-medium">{ps.name}</p>
            <p className="text-slate-500 text-[8px]">{ps.classification} · v{ps.version} · {new Date(ps.genesis_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Flags */}
        <div className="flex gap-2 flex-wrap">
          <Badge className="text-[7px] bg-violet-500/10 text-violet-300/50 border-violet-500/15">
            <Lock className="w-2 h-2 mr-0.5" /> IMMUTABLE
          </Badge>
          <Badge className="text-[7px] bg-violet-500/10 text-violet-300/50 border-violet-500/15">
            <Lock className="w-2 h-2 mr-0.5" /> NON-MOVABLE
          </Badge>
          <Badge className="text-[7px] bg-violet-500/10 text-violet-300/50 border-violet-500/15">
            <EyeOff className="w-2 h-2 mr-0.5" /> NON-DISCOVERABLE
          </Badge>
        </div>

        {/* Expanded: full identity details */}
        {expanded && (
          <div className="border-t border-violet-500/20 pt-2 space-y-2.5">
            {/* Hashes */}
            <div className="space-y-1">
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">Cryptographic Anchors</p>
              <CopyableHash hash={identity.identity_hash} label="Identity" />
              <CopyableHash hash={ps.public_fingerprint} label="Fingerprint" />
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">Purpose</p>
              <p className="text-slate-300 text-[9px] leading-relaxed">{ps.purpose}</p>
            </div>

            {/* Boundary rules */}
            <div className="space-y-1">
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">Trust Boundary</p>
              <BoundaryRule label="Can read" items={br.can_read} type="allow" />
              <BoundaryRule label="Can write" items={br.can_write} type="allow" />
              <BoundaryRule label="Can invoke" items={br.can_invoke} type="allow" />
              <BoundaryRule label="Cannot access" items={br.cannot_access} type="deny" />
              <BoundaryRule label="Cannot expose" items={br.cannot_expose} type="deny" />
              <div className="flex items-center gap-2 text-[9px] text-slate-400">
                <Eye className="w-3 h-3 text-slate-500" />
                <span>Scope: {br.scope} · Visibility: {br.visibility}</span>
              </div>
            </div>

            {/* Behaviour rules */}
            <div className="space-y-1">
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">Enforcement</p>
              <div className="grid grid-cols-2 gap-1 text-[8px]">
                {['editable', 'movable', 'duplicable', 'discoverable', 'overridable', 'impersonable'].map(rule => (
                  <div key={rule} className="flex items-center gap-1 text-red-300">
                    <ShieldOff className="w-2.5 h-2.5" />
                    <span>cannot be {rule.replace('able', 'ed').replace('ible', 'ed')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
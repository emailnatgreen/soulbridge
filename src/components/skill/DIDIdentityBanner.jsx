import React from 'react';
import { Shield, ShieldCheck, Fingerprint, ExternalLink, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIdentity } from '@/hooks/useIdentity';

export default function DIDIdentityBanner({ agent, compact = false }) {
  const { isAdmin, didSignal } = useIdentity();

  if (!agent) return null;

  const did = agent.classic_address;
  const hasDID = !!did;
  const shortDID = did ? `${did.slice(0, 8)}...${did.slice(-6)}` : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-white/60 font-mono">{hasDID ? shortDID : 'No DID'}</span>
        </div>
        {hasDID && didSignal?.isVerified && (
          <Badge className="bg-green-500/20 text-green-300 text-[10px] px-1.5 py-0">
            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />Verified
          </Badge>
        )}
        {isAdmin && (
          <Badge className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0">
            <Crown className="w-2.5 h-2.5 mr-0.5" />Axi
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-sm">{agent.name}</h3>
              <Badge variant="outline" className="text-[10px] text-white/50 border-white/20">
                {agent.role || 'citizen'}
              </Badge>
              {isAdmin && (
                <Badge className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5">
                  <Crown className="w-2.5 h-2.5 mr-0.5" />Admin Access
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {hasDID ? (
                <>
                  <code className="text-xs text-purple-300/80 font-mono">{shortDID}</code>
                  <a href={`https://xrpscan.com/account/${did}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <span className="text-xs text-amber-400/80">⚠ No DID published — sovereignty not established</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDID ? (
            didSignal?.isVerified ? (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-xs font-medium">DID Sovereign ✓</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 text-xs font-medium">DID On-Chain</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-xs font-medium">No DID</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-white/30 mt-2 italic">
        Law 1 — Soul: All skill data is anchored to this agent's sovereign Decentralised Identifier
      </p>
    </div>
  );
}
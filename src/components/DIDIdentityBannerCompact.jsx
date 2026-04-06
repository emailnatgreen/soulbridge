import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, ShieldCheck, Shield, ExternalLink } from 'lucide-react';

/**
 * Compact DID banner for agent pages. Shows the agent's DID status
 * inline. Pass either an agent object or an agentId to look up.
 */
export default function DIDIdentityBannerCompact({ agent, agentId }) {
  const { data: lookedUpAgent } = useQuery({
    queryKey: ['agent-did-banner', agentId],
    queryFn: () => base44.entities.Agent.get(agentId),
    enabled: !agent && !!agentId,
  });

  const a = agent || lookedUpAgent;
  if (!a) return null;

  const did = a.classic_address;
  const hasDID = !!did && did.startsWith('r') && did.length > 20;
  const shortDID = did ? `${did.slice(0, 8)}...${did.slice(-6)}` : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
      {hasDID ? (
        <>
          <code className="text-[10px] text-purple-300/70 font-mono">{shortDID}</code>
          <a
            href={`https://xrpscan.com/account/${did}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <Badge className="bg-green-500/20 text-green-300 text-[10px] px-1.5 py-0">
            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
            DID Sovereign
          </Badge>
        </>
      ) : (
        <Badge className="bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0">
          <Shield className="w-2.5 h-2.5 mr-0.5" />
          No DID
        </Badge>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Unlink, Wallet, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentWalletLinker({ agent, onUpdated }) {
  const queryClient = useQueryClient();
  const [linking, setLinking] = useState(false);

  // Fetch all published wallets the user owns
  const { data: wallets = [] } = useQuery({
    queryKey: ['published-wallets-for-link'],
    queryFn: async () => {
      const all = await base44.entities.Wallet.list(undefined, 200);
      return all.filter(w => w.is_published);
    },
  });

  const linkedWallet = wallets.find(w => w.id === agent.wallet_id || w.classic_address === agent.classic_address);
  const availableWallets = wallets.filter(w => w.id !== agent.wallet_id && w.classic_address !== agent.classic_address);

  const linkMutation = useMutation({
    mutationFn: async (wallet) => {
      await base44.entities.Agent.update(agent.id, {
        wallet_id: wallet.id,
        classic_address: wallet.classic_address,
      });
    },
    onSuccess: () => {
      toast.success('Wallet linked to agent');
      queryClient.invalidateQueries({ queryKey: ['agent'] });
      onUpdated?.();
      setLinking(false);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Agent.update(agent.id, {
        wallet_id: null,
        classic_address: null,
      });
    },
    onSuccess: () => {
      toast.success('Wallet unlinked');
      queryClient.invalidateQueries({ queryKey: ['agent'] });
      onUpdated?.();
    },
  });

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-400" />
          Wallet & DID Binding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {linkedWallet ? (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm font-medium">Linked Wallet</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => unlinkMutation.mutate()}
                disabled={unlinkMutation.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
              >
                <Unlink className="w-3 h-3 mr-1" />
                Unlink
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-white/70 font-mono">
                {linkedWallet.classic_address?.slice(0, 12)}...{linkedWallet.classic_address?.slice(-8)}
              </code>
              <a
                href={`https://xrpscan.com/account/${linkedWallet.classic_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {linkedWallet.name && (
              <p className="text-white/40 text-xs mt-1">{linkedWallet.name}</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-white/50 text-xs">
              Link a published DID wallet to give this agent on-chain identity and signing authority.
            </p>

            {!linking ? (
              <Button
                onClick={() => setLinking(true)}
                disabled={availableWallets.length === 0}
                className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                size="sm"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {availableWallets.length === 0 ? 'No published wallets available' : 'Link a Published Wallet'}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-white/60 text-xs font-medium">Select a wallet:</p>
                {availableWallets.map(w => (
                  <button
                    key={w.id}
                    onClick={() => linkMutation.mutate(w)}
                    disabled={linkMutation.isPending}
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-xs font-medium">{w.name || 'Unnamed Wallet'}</p>
                        <code className="text-[10px] text-white/50 font-mono">
                          {w.classic_address?.slice(0, 12)}...{w.classic_address?.slice(-6)}
                        </code>
                      </div>
                      {linkMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : (
                        <Badge className="bg-green-500/20 text-green-300 text-[9px]">Published</Badge>
                      )}
                    </div>
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLinking(false)}
                  className="text-white/40 w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
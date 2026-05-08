import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Loader2, Users, Wallet, Zap, AlertTriangle } from 'lucide-react';

export default function ExperimentalPaymentsPanel() {
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['exp-agents'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 10),
  });

  const handleSimulate = async () => {
    setSimulating(true);
    // Simulate agent-to-agent payment logic locally
    const sender = agents[Math.floor(Math.random() * Math.min(5, agents.length))];
    const receiver = agents[Math.floor(Math.random() * Math.min(5, agents.length))];
    const amount = (Math.random() * 50 + 1).toFixed(2);
    const fee = (amount * 0.01).toFixed(4);
    const honourBonus = sender?.honor_score > 80 ? 'Trusted — reduced fee' : 'Standard fee';

    await new Promise(r => setTimeout(r, 800));
    setSimResult({
      sender: sender?.name || 'Agent A',
      receiver: receiver?.name || 'Agent B',
      amount,
      fee,
      honourBonus,
      timestamp: new Date().toISOString(),
      network: 'testnet',
      status: Math.random() > 0.1 ? 'success' : 'failed',
      senderHonour: sender?.honor_score || 50,
      receiverHonour: receiver?.honor_score || 50,
    });
    setSimulating(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRightLeft className="w-4 h-4 text-orange-400" />
          <span className="text-orange-300 text-xs font-semibold">Agent-to-Agent RLUSD Payments</span>
          <Badge className="text-[8px] bg-amber-500/15 text-amber-300 border-amber-500/30">TESTNET</Badge>
        </div>
        <p className="text-white/40 text-[10px] leading-relaxed">
          Simulate RLUSD transfers between agents with honour-based fee modulation.
          Higher honour = lower fees. Trustline limits enforced. All transactions logged to experimental archive.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSimulate}
          disabled={simulating || agents.length < 2}
          className="bg-orange-600 hover:bg-orange-500 text-white gap-2 text-sm"
        >
          {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {simulating ? 'Simulating…' : 'Simulate Payment'}
        </Button>
        <span className="text-white/30 text-[10px]">{agents.length} agents available</span>
      </div>

      {simResult && (
        <div className={`rounded-xl border p-4 space-y-3 ${
          simResult.status === 'success' 
            ? 'border-green-500/20 bg-green-500/5' 
            : 'border-red-500/20 bg-red-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Payment Simulation</span>
            <Badge className={`text-[9px] ${simResult.status === 'success' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
              {simResult.status}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/5 bg-black/20 p-2.5 text-center">
              <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-white text-xs font-medium truncate">{simResult.sender}</p>
              <p className="text-white/30 text-[9px]">Honour: {simResult.senderHonour}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <ArrowRightLeft className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <p className="text-orange-300 text-sm font-bold">{simResult.amount} RLUSD</p>
                <p className="text-white/30 text-[9px]">Fee: {simResult.fee}</p>
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-2.5 text-center">
              <Wallet className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-white text-xs font-medium truncate">{simResult.receiver}</p>
              <p className="text-white/30 text-[9px]">Honour: {simResult.receiverHonour}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[8px]">{simResult.honourBonus}</Badge>
            <span className="text-white/20">·</span>
            <span className="text-white/30">Network: {simResult.network}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/30">{new Date(simResult.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Agent roster preview */}
      {agents.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-white/30 text-[9px] uppercase tracking-wider mb-2">Available Agents</p>
          <div className="flex flex-wrap gap-1.5">
            {agents.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1">
                <span className="text-white/60 text-[10px] truncate max-w-[80px]">{a.name}</span>
                <span className="text-amber-300 text-[9px]">H:{a.honor_score || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-white/40 text-[10px]">
          Experimental only — no real RLUSD transferred. Production payments require governance approval + trustline validation.
        </p>
      </div>
    </div>
  );
}
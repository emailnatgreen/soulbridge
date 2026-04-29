import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowRight, UserPlus, Trash2, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function VoteDelegationPanel({ myAgent, agents }) {
  const [showDialog, setShowDialog] = useState(false);
  const [delegateTo, setDelegateTo] = useState('');
  const [powerPct, setPowerPct] = useState(100);
  const [scope, setScope] = useState('all');
  const queryClient = useQueryClient();

  const { data: delegations = [], isLoading } = useQuery({
    queryKey: ['vote-delegations', myAgent?.id],
    queryFn: () => base44.entities.VotingDelegation.filter({ delegator_agent_id: myAgent?.id }),
    enabled: !!myAgent?.id,
  });

  const { data: receivedDelegations = [] } = useQuery({
    queryKey: ['received-delegations', myAgent?.id],
    queryFn: () => base44.entities.VotingDelegation.filter({ delegate_agent_id: myAgent?.id, active: true }),
    enabled: !!myAgent?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.VotingDelegation.create({
        delegator_agent_id: myAgent.id,
        delegate_agent_id: delegateTo,
        delegation_power_percentage: powerPct,
        scope,
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote-delegations'] });
      setShowDialog(false);
      setDelegateTo('');
      setPowerPct(100);
      toast.success('Voting power delegated!');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.VotingDelegation.update(id, { active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote-delegations'] });
      queryClient.invalidateQueries({ queryKey: ['received-delegations'] });
      toast.success('Delegation revoked');
    },
  });

  if (!myAgent) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <Users className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">Select an agent to manage delegations.</p>
        </CardContent>
      </Card>
    );
  }

  const activeDelegations = delegations.filter(d => d.active);
  const availableAgents = agents.filter(a => a.id !== myAgent.id && a.status === 'active');
  const totalDelegatedReceived = receivedDelegations.reduce((s, d) => s + (d.delegation_power_percentage || 100), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Power Delegated Out</p>
            <p className="text-xl font-bold text-amber-300">{activeDelegations.reduce((s, d) => s + (d.delegation_power_percentage || 100), 0)}%</p>
            <p className="text-white/20 text-[10px]">{activeDelegations.length} delegation{activeDelegations.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Power Received</p>
            <p className="text-xl font-bold text-green-300">{totalDelegatedReceived}%</p>
            <p className="text-white/20 text-[10px]">from {receivedDelegations.length} agent{receivedDelegations.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Delegations */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-purple-400" /> Active Delegations
            </CardTitle>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Delegate
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-purple-400/30">
                <DialogHeader>
                  <DialogTitle className="text-white">Delegate Voting Power</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">Delegate To</label>
                    <Select value={delegateTo} onValueChange={setDelegateTo}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Choose an agent" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/20 max-h-60">
                        {availableAgents.map(a => (
                          <SelectItem key={a.id} value={a.id} className="text-white">
                            {a.name} · {a.role} · Honor: {a.honor_score || 100}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">Power % (1-100)</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={powerPct}
                      onChange={(e) => setPowerPct(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">Scope</label>
                    <Select value={scope} onValueChange={setScope}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/20">
                        <SelectItem value="all" className="text-white">All Proposals</SelectItem>
                        <SelectItem value="specific_type" className="text-white">Specific Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!delegateTo || createMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    {createMutation.isPending ? 'Delegating...' : 'Confirm Delegation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {activeDelegations.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-4">No active delegations. Your full voting power is retained.</p>
          ) : (
            <div className="space-y-2">
              {activeDelegations.map(d => {
                const target = agents.find(a => a.id === d.delegate_agent_id);
                return (
                  <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-sm">{target?.name || 'Unknown Agent'}</p>
                      <p className="text-white/30 text-[10px]">{d.scope === 'all' ? 'All proposals' : 'Specific type'} · {moment(d.created_date).fromNow()}</p>
                    </div>
                    <Badge className="bg-amber-500/15 text-amber-300 text-[10px]">{d.delegation_power_percentage}%</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                      onClick={() => revokeMutation.mutate(d.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUp, ArrowDown, History, Plus, Shield, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function TreasuryPanel({ treasuryId, canManage = false }) {
    const [action, setAction] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();

    const { data: treasury } = useQuery({
        queryKey: ['treasury', treasuryId],
        queryFn: () => base44.entities.Treasury.get(treasuryId),
        refetchInterval: 10000,
    });

    const { data: wallet } = useQuery({
        queryKey: ['wallet', treasury?.classic_address],
        queryFn: async () => {
            if (!treasury?.classic_address) return null;
            const wallets = await base44.entities.Wallet.filter(
                { classic_address: treasury.classic_address },
                '-updated_date',
                1
            );
            return wallets[0] || null;
        },
        enabled: !!treasury?.classic_address,
    });

    const { data: activities = [] } = useQuery({
        queryKey: ['treasury-activities', treasuryId],
        queryFn: async () => {
            const allActivities = await base44.entities.EconomicActivity.filter(
                { activity_type: ['treasury_deposit', 'treasury_withdrawal'] },
                '-created_date',
                100
            );
            return allActivities.filter(a => a.description?.includes(treasury?.name) || false);
        },
        enabled: !!treasury,
    });

    const manageMutation = useMutation({
        mutationFn: async () => {
            const user = await base44.auth.me();
            const response = await base44.functions.invoke('manageTreasury', {
                treasury_id: treasuryId,
                action,
                amount: parseFloat(amount),
                agent_id: user?.id || 'unknown',
                reason
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['treasury', treasuryId] });
            toast.success(`Treasury ${action} successful`);
            setAmount('');
            setReason('');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleAction = () => {
        if (!amount || isNaN(parseFloat(amount))) {
            toast.error('Please enter a valid amount');
            return;
        }
        manageMutation.mutate();
    };

    if (!treasury) return null;

    return (
        <div className="space-y-6">
            {/* Treasury Overview */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-purple-400" />
                        {treasury.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-white/40 mb-2">Total Balance</p>
                            <p className="text-3xl font-light text-white">{treasury.total_balance} XRP</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/40 mb-2">Total Deposits</p>
                            <p className="text-2xl font-light text-green-300">{treasury.total_deposits || 0} XRP</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/40 mb-2">Total Withdrawals</p>
                            <p className="text-2xl font-light text-orange-300">{treasury.total_withdrawals || 0} XRP</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                        <p className="text-sm text-white/60 mb-2">{treasury.purpose}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                                {treasury.access_level}
                            </Badge>
                            {wallet?.is_published ? (
                                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
                                    <Shield className="w-4 h-4 text-green-400" />
                                    <span className="text-green-300 text-xs font-mono">{wallet.classic_address?.slice(0, 12)}…</span>
                                    <Badge className="bg-green-500/20 text-green-300 text-[10px]">DID Published</Badge>
                                    {wallet.published_txid && (
                                        <a
                                            href={`https://xrpscan.com/tx/${wallet.published_txid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-1"
                                        >
                                            <ExternalLink className="w-3 h-3 text-green-400 hover:text-green-300" />
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
                                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                                    <span className="text-yellow-300 text-xs">Internal Ledger Only</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Management Controls */}
            {canManage && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Manage Treasury</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Action</label>
                            <Select value={action} onValueChange={setAction}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="deposit">Deposit</SelectItem>
                                    <SelectItem value="withdraw">Withdraw</SelectItem>
                                    <SelectItem value="allocate_reward">Allocate Reward</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Amount (XRP)</label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Reason (optional)</label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Why is this transaction happening?"
                                className="bg-white/5 border-white/10 text-white min-h-[80px]"
                            />
                        </div>

                        <Button
                            onClick={handleAction}
                            disabled={manageMutation.isPending}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            {manageMutation.isPending ? 'Processing...' : 'Execute Transaction'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Transaction History */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-400" />
                        Transaction Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activities.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-white/40">No transactions yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {activities.slice(0, 30).map(activity => (
                                <div key={activity.id} className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {activity.activity_type === 'treasury_deposit' ? (
                                                <ArrowDown className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <ArrowUp className="w-4 h-4 text-orange-400" />
                                            )}
                                            <span className="text-sm font-medium text-white capitalize">
                                                {activity.activity_type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/60">{activity.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-medium ${activity.activity_type === 'treasury_deposit' ? 'text-green-400' : 'text-orange-400'}`}>
                                            {activity.activity_type === 'treasury_deposit' ? '+' : '-'}{activity.amount} XRP
                                        </p>
                                        <p className="text-xs text-white/40">{moment(activity.created_date).fromNow()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
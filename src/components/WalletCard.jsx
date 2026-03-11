import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Copy, RefreshCw, Eye, EyeOff, History, UserPlus, Loader2, Send } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import WalletTransactionHistory from './WalletTransactionHistory';
import WalletQRCode from './WalletQRCode';
import WalletTrustlines from './WalletTrustlines';
import CurrencyConverter from './CurrencyConverter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function WalletCard({ wallet, onRefresh }) {
    const [showSeed, setShowSeed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh(wallet.id);
        setRefreshing(false);
    };

    const reassignWallet = useMutation({
        mutationFn: async ({ wallet_id, new_owner_id }) => {
            const response = await base44.functions.invoke('reassignWalletOwnership', { wallet_id, new_owner_id });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            toast.success('Wallet ownership reassigned successfully!');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.error || 'Failed to reassign wallet');
        }
    });

    const handleReassign = () => {
        if (currentUser?.id) {
            reassignWallet.mutate({ wallet_id: wallet.id, new_owner_id: currentUser.id });
        }
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{wallet.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                                {wallet.network}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {currentUser?.role === 'admin' && wallet.owner_id !== currentUser?.id && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReassign}
                                disabled={reassignWallet.isPending}
                                className="text-xs"
                            >
                                {reassignWallet.isPending ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                    <UserPlus className="w-3 h-3 mr-1" />
                                )}
                                Reassign to Me
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Balance</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {wallet.balance?.toFixed(6) || '0.000000'} XRP
                    </p>
                </div>

                <CurrencyConverter walletBalance={wallet.balance || 0} />

                <div>
                    <p className="text-sm text-gray-500 mb-1">DID / Address</p>
                    {wallet.classic_address ? (
                        <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
                                {wallet.classic_address}
                            </code>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(wallet.classic_address, 'Address')}
                                className="h-8 w-8"
                            >
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            <p className="text-xs text-amber-800">
                                ⚠️ Wallet not yet activated on XRPL. Fund with XRP to generate address.
                            </p>
                        </div>
                    )}
                </div>

                {wallet.encrypted_seed && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-500">Seed (Keep Secret!)</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSeed(!showSeed)}
                                className="h-6 w-6"
                            >
                                {showSeed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                        </div>
                        {showSeed ? (
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-red-50 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis text-red-700">
                                    {wallet.encrypted_seed}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(wallet.encrypted_seed, 'Seed')}
                                    className="h-8 w-8"
                                >
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                                ••••••••••••••••••••••••••••••
                            </code>
                        )}
                    </div>
                )}

                {wallet.notes && (
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Notes</p>
                        <p className="text-sm">{wallet.notes}</p>
                    </div>
                )}

                <WalletQRCode wallet={wallet} currentUser={currentUser} />

                <WalletTrustlines wallet={wallet} />

                {wallet.classic_address && (
                    <Link to={createPageUrl('Send') + `?from_wallet_id=${wallet.id}`} className="block">
                        <Button variant="outline" className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100">
                            <Send className="w-4 h-4 mr-2" />
                            Send XRP
                        </Button>
                    </Link>
                )}

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <History className="w-4 h-4 mr-2" />
                            View Transaction History
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>Transaction History - {wallet.name}</DialogTitle>
                        </DialogHeader>
                        <WalletTransactionHistory wallet={wallet} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
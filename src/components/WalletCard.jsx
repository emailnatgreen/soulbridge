import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Copy, RefreshCw, Eye, EyeOff, History } from "lucide-react";
import { toast } from "sonner";
import WalletTransactionHistory from './WalletTransactionHistory';

export default function WalletCard({ wallet, onRefresh }) {
    const [showSeed, setShowSeed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh(wallet.id);
        setRefreshing(false);
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
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Balance</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {wallet.balance?.toFixed(6) || '0.000000'} XRP
                    </p>
                </div>

                <div>
                    <p className="text-sm text-gray-500 mb-1">DID / Address</p>
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
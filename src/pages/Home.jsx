import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wallet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import WalletCard from "../components/WalletCard";

export default function Home() {
    const [showDialog, setShowDialog] = useState(false);
    const [walletName, setWalletName] = useState("");
    const [network, setNetwork] = useState("testnet");
    const [createdSeed, setCreatedSeed] = useState("");

    const queryClient = useQueryClient();

    const { data: wallets = [], isLoading } = useQuery({
        queryKey: ['wallets'],
        queryFn: () => base44.entities.Wallet.list('-created_date'),
        initialData: [],
    });

    const createWalletMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('createWallet', {
                name: walletName,
                network: network
            });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            toast.success(data.message);
            setCreatedSeed(data.wallet.seed);
            setWalletName("");
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create wallet');
        }
    });

    const refreshBalanceMutation = useMutation({
        mutationFn: async (walletId) => {
            const response = await base44.functions.invoke('getBalance', {
                wallet_id: walletId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            toast.success('Balance updated');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to refresh balance');
        }
    });

    const handleCreateWallet = () => {
        if (!walletName.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }
        createWalletMutation.mutate();
    };

    const handleCloseDialog = () => {
        setShowDialog(false);
        setCreatedSeed("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">SoulBridge</h1>
                        <p className="text-gray-600">Manage your XRPL DIDs and wallets</p>
                    </div>
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Wallet
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Wallet</DialogTitle>
                            </DialogHeader>
                            {createdSeed ? (
                                <div className="space-y-4">
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-red-900 mb-2">
                                                    Save Your Seed Phrase!
                                                </p>
                                                <p className="text-sm text-red-800 mb-3">
                                                    This is the ONLY time you'll see this. Store it somewhere safe!
                                                </p>
                                                <code className="block bg-white px-3 py-2 rounded border border-red-300 text-sm break-all">
                                                    {createdSeed}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleCloseDialog}
                                        className="w-full"
                                    >
                                        I've Saved It Safely
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Wallet Name</Label>
                                        <Input
                                            id="name"
                                            value={walletName}
                                            onChange={(e) => setWalletName(e.target.value)}
                                            placeholder="My Wallet"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="network">Network</Label>
                                        <Select value={network} onValueChange={setNetwork}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="testnet">Testnet</SelectItem>
                                                <SelectItem value="mainnet">Mainnet</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        onClick={handleCreateWallet}
                                        disabled={createWalletMutation.isPending}
                                        className="w-full"
                                    >
                                        {createWalletMutation.isPending ? 'Creating...' : 'Create Wallet'}
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-500">Loading wallets...</p>
                    </div>
                ) : wallets.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                        <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No wallets yet</p>
                        <p className="text-sm text-gray-500">Create your first XRPL wallet to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wallets.map((wallet) => (
                            <WalletCard
                                key={wallet.id}
                                wallet={wallet}
                                onRefresh={(id) => refreshBalanceMutation.mutate(id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, ShoppingCart, TrendingUp, TrendingDown, Minus, Package, Factory } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ResourceMarketplace() {
    const [selectedAgent, setSelectedAgent] = useState('');
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [tradeAmount, setTradeAmount] = useState(1);
    const queryClient = useQueryClient();

    const { data: markets = [] } = useQuery({
        queryKey: ['resourceMarkets'],
        queryFn: () => base44.entities.ResourceMarket.list(),
        refetchInterval: 10000
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const { data: agentResources = [] } = useQuery({
        queryKey: ['agentResources', selectedAgent],
        queryFn: () => selectedAgent ? base44.entities.Resource.filter({ agent_id: selectedAgent }) : [],
        enabled: !!selectedAgent
    });

    const { data: productionChains = [] } = useQuery({
        queryKey: ['productionChains', selectedAgent],
        queryFn: () => selectedAgent ? base44.entities.ProductionChain.filter({ agent_id: selectedAgent }) : [],
        enabled: !!selectedAgent
    });

    const tradeMutation = useMutation({
        mutationFn: async ({ action }) => {
            const response = await base44.functions.invoke('tradeOnMarket', {
                agent_id: selectedAgent,
                resource_type: selectedMarket.resource_type,
                amount: tradeAmount,
                action
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['resourceMarkets']);
            queryClient.invalidateQueries(['agentResources']);
            setTradeAmount(1);
        }
    });

    const createChainMutation = useMutation({
        mutationFn: async (recipeName) => {
            const response = await base44.functions.invoke('createProductionChain', {
                agent_id: selectedAgent,
                recipe_name: recipeName
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['productionChains']);
        }
    });

    const resourceIcons = {
        lumber: '🌲',
        stone: '🪨',
        food: '🌾',
        water: '💧',
        metal: '⛏️',
        crystal: '💎',
        herb: '🌿',
        energy: '⚡',
        knowledge: '📚'
    };

    const agentInventory = selectedAgent ? agentResources.reduce((acc, r) => {
        acc[r.resource_type] = r.amount;
        return acc;
    }, {}) : {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
                                    <ShoppingCart className="w-8 h-8" />
                                    Resource Marketplace
                                </h1>
                                <p className="text-sm text-purple-300/60">Dynamic economy with supply & demand</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Agent Selection */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
                    <CardHeader>
                        <CardTitle className="text-white text-sm">Select Trading Agent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue placeholder="Choose agent..." />
                            </SelectTrigger>
                            <SelectContent>
                                {agents.map(agent => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                        {agent.name} ({agent.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Markets */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Active Markets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {markets.map(market => {
                                        const Icon = market.price_trend === 'rising' ? TrendingUp : 
                                                   market.price_trend === 'falling' ? TrendingDown : Minus;
                                        const trendColor = market.price_trend === 'rising' ? 'text-green-400' : 
                                                          market.price_trend === 'falling' ? 'text-red-400' : 'text-gray-400';

                                        return (
                                            <div
                                                key={market.id}
                                                onClick={() => setSelectedMarket(market)}
                                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                    selectedMarket?.id === market.id
                                                        ? 'bg-purple-500/20 border-purple-500/50'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl">{resourceIcons[market.resource_type]}</span>
                                                        <span className="text-white font-medium capitalize">
                                                            {market.resource_type}
                                                        </span>
                                                    </div>
                                                    <Icon className={`w-4 h-4 ${trendColor}`} />
                                                </div>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-white/60">Price:</span>
                                                        <span className="text-green-300">{market.current_price?.toFixed(2)} XRP</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white/60">Supply:</span>
                                                        <span className="text-white">{market.supply || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white/60">Volume:</span>
                                                        <span className="text-white/80">{market.total_volume || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Production Chains */}
                        {selectedAgent && (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10 mt-6">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Factory className="w-5 h-5" />
                                        Production Chains
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {productionChains.map(chain => (
                                            <div key={chain.id} className="p-3 bg-white/5 rounded border border-white/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-white text-sm font-medium capitalize">
                                                        {chain.recipe_name.replace(/_/g, ' ')}
                                                    </span>
                                                    <Badge variant={chain.status === 'active' ? 'default' : 'outline'}>
                                                        {chain.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-white/60">
                                                    Produced: {chain.total_produced || 0} | Efficiency: {((chain.efficiency || 1) * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        ))}
                                        {productionChains.length === 0 && (
                                            <p className="text-white/40 text-sm text-center py-4">No production chains yet</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Trading Panel */}
                    <div className="space-y-6">
                        {selectedAgent && agentResources.length > 0 && (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white text-sm flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Inventory
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {agentResources.map(resource => (
                                            <div key={resource.id} className="flex items-center justify-between text-sm">
                                                <span className="text-white/80 capitalize flex items-center gap-2">
                                                    <span>{resourceIcons[resource.resource_type]}</span>
                                                    {resource.resource_type}
                                                </span>
                                                <Badge variant="outline">{resource.amount}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {selectedMarket && selectedAgent && (
                            <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border-purple-500/40">
                                <CardHeader>
                                    <CardTitle className="text-white">Trade {selectedMarket.resource_type}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm text-white/60 mb-2 block">Amount</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={tradeAmount}
                                            onChange={(e) => setTradeAmount(parseInt(e.target.value) || 1)}
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                    </div>

                                    <div className="p-3 bg-black/20 rounded">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-white/60">Unit Price:</span>
                                            <span className="text-white">{selectedMarket.current_price?.toFixed(2)} XRP</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/60">Total Cost:</span>
                                            <span className="text-green-300 font-medium">
                                                {(selectedMarket.current_price * tradeAmount).toFixed(2)} XRP
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => tradeMutation.mutate({ action: 'buy' })}
                                            disabled={tradeMutation.isPending}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Buy
                                        </Button>
                                        <Button
                                            onClick={() => tradeMutation.mutate({ action: 'sell' })}
                                            disabled={tradeMutation.isPending || 
                                                     (agentInventory[selectedMarket.resource_type] || 0) < tradeAmount}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            Sell
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
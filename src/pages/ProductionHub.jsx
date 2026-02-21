import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Factory, Play, Pause, CheckCircle2, Clock, TrendingUp, Package, ArrowRight, Sparkles, Zap, AlertCircle } from 'lucide-react';

export default function ProductionHub() {
    const [selectedAgent, setSelectedAgent] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [cycleQuantity, setCycleQuantity] = useState(1);
    const queryClient = useQueryClient();

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: () => base44.entities.ProductionRecipe.list()
    });

    const { data: chains = [] } = useQuery({
        queryKey: ['chains', selectedAgent],
        queryFn: () => selectedAgent ? 
            base44.entities.ProductionChain.filter({ agent_id: selectedAgent }) : [],
        enabled: !!selectedAgent,
        refetchInterval: 10000
    });

    const { data: agentResources = [] } = useQuery({
        queryKey: ['resources', selectedAgent],
        queryFn: () => selectedAgent ? 
            base44.entities.Resource.filter({ agent_id: selectedAgent }) : [],
        enabled: !!selectedAgent
    });

    const initRecipesMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('initializeProductionRecipes', {});
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['recipes']);
        }
    });

    const startChainMutation = useMutation({
        mutationFn: async ({ agent_id, recipe_id, quantity_cycles }) => {
            const response = await base44.functions.invoke('startProductionChain', {
                agent_id,
                recipe_id,
                quantity_cycles
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chains']);
            queryClient.invalidateQueries(['resources']);
            setSelectedRecipe(null);
        }
    });

    const processCyclesMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('processProductionCycles', {});
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chains']);
            queryClient.invalidateQueries(['resources']);
        }
    });

    const agent = agents.find(a => a.id === selectedAgent);
    const activeChains = chains.filter(c => c.status === 'active');
    const completedChains = chains.filter(c => c.status === 'completed');

    const resourceInventory = {};
    agentResources.forEach(r => {
        const key = `${r.resource_category}_${r.resource_name}`;
        resourceInventory[key] = r.amount || 0;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
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
                                    <Factory className="w-8 h-8" />
                                    Production Hub
                                </h1>
                                <p className="text-sm text-purple-300/60">Transform Resources • Create Value • Build the Economy</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {recipes.length === 0 && (
                                <Button 
                                    onClick={() => initRecipesMutation.mutate()}
                                    disabled={initRecipesMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Initialize Recipes
                                </Button>
                            )}
                            <Button 
                                onClick={() => processCyclesMutation.mutate()}
                                disabled={processCyclesMutation.isPending}
                                variant="outline"
                                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Process Cycles
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
                    <CardHeader>
                        <CardTitle className="text-white text-sm">Select Agent</CardTitle>
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

                {selectedAgent && (
                    <Tabs defaultValue="recipes" className="space-y-6">
                        <TabsList className="bg-white/5 border border-white/10">
                            <TabsTrigger value="recipes">Available Recipes</TabsTrigger>
                            <TabsTrigger value="active">Active ({activeChains.length})</TabsTrigger>
                            <TabsTrigger value="completed">Completed ({completedChains.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="recipes" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {recipes.map(recipe => {
                                    const canStart = recipe.required_skills?.every(skill => 
                                        agent.core_skills?.some(s => s.name === skill)
                                    );
                                    
                                    const hasInputs = recipe.inputs?.every(input => {
                                        const key = `${input.resource_category}_${input.resource_name}`;
                                        return (resourceInventory[key] || 0) >= input.quantity;
                                    });

                                    return (
                                        <Card 
                                            key={recipe.id}
                                            className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all"
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <CardTitle className="text-white text-base">{recipe.recipe_name}</CardTitle>
                                                        <Badge className="mt-1 bg-purple-500/20 text-purple-400 text-xs capitalize">
                                                            {recipe.category}
                                                        </Badge>
                                                    </div>
                                                    <Badge className={
                                                        recipe.complexity === 'simple' ? 'bg-green-500/20 text-green-400' :
                                                        recipe.complexity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        recipe.complexity === 'complex' ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }>
                                                        {recipe.complexity}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-sm text-white/60">{recipe.description}</p>
                                                
                                                <div className="space-y-2">
                                                    <div className="text-xs text-white/80 font-medium">Inputs:</div>
                                                    {recipe.inputs?.map((input, idx) => {
                                                        const key = `${input.resource_category}_${input.resource_name}`;
                                                        const available = resourceInventory[key] || 0;
                                                        const hasEnough = available >= input.quantity;
                                                        
                                                        return (
                                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                                <span className={hasEnough ? 'text-white/70' : 'text-red-400'}>
                                                                    {input.resource_name} x{input.quantity}
                                                                </span>
                                                                <span className={hasEnough ? 'text-green-400' : 'text-red-400'}>
                                                                    {available}/{input.quantity}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-purple-300">
                                                    <ArrowRight className="w-4 h-4" />
                                                    <span>Produces:</span>
                                                </div>

                                                <div className="space-y-1">
                                                    {recipe.outputs?.map((output, idx) => (
                                                        <div key={idx} className="text-sm text-green-400">
                                                            {output.resource_name} x{output.quantity}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="pt-2 border-t border-white/10 space-y-1 text-xs text-white/60">
                                                    <div>Duration: {recipe.cycle_duration_hours}h per cycle</div>
                                                    <div>Efficiency: {((recipe.base_efficiency || 1) * 100).toFixed(0)}%</div>
                                                </div>

                                                {!canStart && (
                                                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                                                        <AlertCircle className="w-3 h-3 inline mr-1" />
                                                        Missing skills: {recipe.required_skills?.filter(s => 
                                                            !agent.core_skills?.some(as => as.name === s)
                                                        ).join(', ')}
                                                    </div>
                                                )}

                                                <Button
                                                    onClick={() => setSelectedRecipe(recipe)}
                                                    disabled={!canStart || !hasInputs}
                                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                                >
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Start Production
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="active">
                            <div className="space-y-4">
                                {activeChains.map(chain => {
                                    const progress = (chain.cycles_completed / chain.cycles_planned) * 100;
                                    
                                    return (
                                        <Card key={chain.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-white">{chain.recipe_name}</CardTitle>
                                                    <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span className="text-white/60">Progress</span>
                                                        <span className="text-white">{chain.cycles_completed}/{chain.cycles_planned} cycles</span>
                                                    </div>
                                                    <Progress value={progress} className="h-2" />
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-white/60">Total Produced</div>
                                                        <div className="text-white font-medium">{chain.total_produced || 0} units</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-white/60">Efficiency</div>
                                                        <div className="text-green-400 font-medium">
                                                            {((chain.efficiency || 1) * 100).toFixed(0)}%
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-white/60">Next Cycle</div>
                                                        <div className="text-white font-medium flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(chain.next_cycle_at).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-white/60">Started</div>
                                                        <div className="text-white font-medium">
                                                            {new Date(chain.started_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                                {activeChains.length === 0 && (
                                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                        <CardContent className="py-12 text-center text-white/60">
                                            No active production chains
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="completed">
                            <div className="space-y-3">
                                {completedChains.map(chain => (
                                    <Card key={chain.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-white font-medium">{chain.recipe_name}</div>
                                                    <div className="text-sm text-white/60 mt-1">
                                                        Produced {chain.total_produced} units • {chain.cycles_completed} cycles
                                                    </div>
                                                </div>
                                                <Badge className="bg-blue-500/20 text-blue-400">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Complete
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {completedChains.length === 0 && (
                                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                        <CardContent className="py-12 text-center text-white/60">
                                            No completed production chains
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {selectedRecipe && (
                <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Start Production: {selectedRecipe.recipe_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-white/80 mb-2 block">Number of Cycles</label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={cycleQuantity}
                                    onChange={(e) => setCycleQuantity(parseInt(e.target.value) || 1)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>

                            <div className="p-4 bg-white/5 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-white/60">Duration:</span>
                                    <span className="text-white">{selectedRecipe.cycle_duration_hours * cycleQuantity}h</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/60">Total Output:</span>
                                    <span className="text-green-400">
                                        {selectedRecipe.outputs[0].quantity * cycleQuantity} {selectedRecipe.outputs[0].resource_name}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setSelectedRecipe(null)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={() => startChainMutation.mutate({
                                        agent_id: selectedAgent,
                                        recipe_id: selectedRecipe.id,
                                        quantity_cycles: cycleQuantity
                                    })}
                                    disabled={startChainMutation.isPending}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    {startChainMutation.isPending ? 'Starting...' : 'Start Production'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
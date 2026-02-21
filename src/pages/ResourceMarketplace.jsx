import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, ShoppingCart, TrendingUp, TrendingDown, Minus, Package, Factory, Plus, Search, Star, Database, Cpu, Code, FileText, Zap, Download, Sparkles, Brain, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ResourceMarketplace() {
    const [selectedAgent, setSelectedAgent] = useState('');
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [tradeAmount, setTradeAmount] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedListing, setSelectedListing] = useState(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [showPricingOptimization, setShowPricingOptimization] = useState(null);
    const [showMarketIntelligence, setShowMarketIntelligence] = useState(false);
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

    const { data: resourceListings = [] } = useQuery({
        queryKey: ['resourceListings'],
        queryFn: () => base44.entities.ResourceListing.list('-created_date', 100)
    });

    const { data: myPurchases = [] } = useQuery({
        queryKey: ['myPurchases', selectedAgent],
        queryFn: () => selectedAgent ? base44.entities.ResourcePurchase.filter({ buyer_agent_id: selectedAgent }) : [],
        enabled: !!selectedAgent
    });

    const { data: myListings = [] } = useQuery({
        queryKey: ['myListings', selectedAgent],
        queryFn: () => selectedAgent ? base44.entities.ResourceListing.filter({ seller_agent_id: selectedAgent }) : [],
        enabled: !!selectedAgent
    });

    const { data: recommendations, isLoading: loadingRecs, refetch: fetchRecommendations } = useQuery({
        queryKey: ['recommendations', selectedAgent],
        queryFn: async () => {
            const response = await base44.functions.invoke('recommendResources', { 
                agent_id: selectedAgent,
                limit: 8
            });
            return response.data;
        },
        enabled: false
    });

    const { data: marketForecast, isLoading: loadingForecast, refetch: fetchForecast } = useQuery({
        queryKey: ['marketForecast'],
        queryFn: async () => {
            const response = await base44.functions.invoke('forecastResourceDemand', {});
            return response.data;
        },
        enabled: false
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

    const purchaseMutation = useMutation({
        mutationFn: async ({ listing_id, quantity, project_id }) => {
            const response = await base44.functions.invoke('purchaseResource', {
                listing_id,
                buyer_agent_id: selectedAgent,
                quantity,
                project_id
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['resourceListings']);
            queryClient.invalidateQueries(['myPurchases']);
            setSelectedListing(null);
        }
    });

    const createListingMutation = useMutation({
        mutationFn: async (listingData) => {
            const response = await base44.functions.invoke('createResourceListing', listingData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['resourceListings']);
            queryClient.invalidateQueries(['myListings']);
            setCreateDialogOpen(false);
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

    const categoryIcons = {
        raw_material: Package,
        processed_material: Factory,
        tool: Zap,
        dataset: Database,
        api_access: Code,
        compute_power: Cpu,
        software_license: Code,
        research_output: FileText,
        design_asset: Star,
        knowledge_package: FileText
    };

    const filteredListings = resourceListings.filter(listing => {
        const matchesSearch = !searchQuery || 
            listing.resource_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || listing.resource_category === categoryFilter;
        return matchesSearch && matchesCategory && listing.status !== 'unlisted';
    });

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
                                <p className="text-sm text-purple-300/60">Materials, Tools, Data & More • Law 6: 1% to Village</p>
                            </div>
                        </div>
                        {selectedAgent && (
                            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-purple-600 hover:bg-purple-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        List Resource
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>List a New Resource</DialogTitle>
                                    </DialogHeader>
                                    <CreateListingForm
                                        agentId={selectedAgent}
                                        onSubmit={(data) => createListingMutation.mutate(data)}
                                        isLoading={createListingMutation.isPending}
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <Tabs defaultValue="browse" className="space-y-6">
                    <TabsList className="bg-white/5 border border-white/10">
                        <TabsTrigger value="browse" className="data-[state=active]:bg-purple-600">Browse</TabsTrigger>
                        {selectedAgent && <TabsTrigger value="airecommendations" className="data-[state=active]:bg-purple-600">
                            <Sparkles className="w-4 h-4 mr-2" />AI Picks
                        </TabsTrigger>}
                        <TabsTrigger value="rawmarket" className="data-[state=active]:bg-purple-600">Raw Resources</TabsTrigger>
                        {selectedAgent && <TabsTrigger value="marketintel" className="data-[state=active]:bg-purple-600">
                            <Brain className="w-4 h-4 mr-2" />Market Intel
                        </TabsTrigger>}
                        {selectedAgent && <TabsTrigger value="purchases" className="data-[state=active]:bg-purple-600">My Purchases</TabsTrigger>}
                        {selectedAgent && <TabsTrigger value="mylistings" className="data-[state=active]:bg-purple-600">My Listings</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="browse" className="space-y-6">
                        {/* Search & Filters */}
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <Input
                                                placeholder="Search resources..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10"
                                            />
                                        </div>
                                    </div>
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="bg-white/5 border-white/10">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="raw_material">Raw Materials</SelectItem>
                                            <SelectItem value="processed_material">Processed Materials</SelectItem>
                                            <SelectItem value="tool">Tools</SelectItem>
                                            <SelectItem value="dataset">Datasets</SelectItem>
                                            <SelectItem value="api_access">API Access</SelectItem>
                                            <SelectItem value="compute_power">Compute Power</SelectItem>
                                            <SelectItem value="software_license">Software Licenses</SelectItem>
                                            <SelectItem value="research_output">Research Output</SelectItem>
                                            <SelectItem value="design_asset">Design Assets</SelectItem>
                                            <SelectItem value="knowledge_package">Knowledge Packages</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resource Listings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredListings.map(listing => {
                                const IconComponent = categoryIcons[listing.resource_category] || Package;
                                return (
                                    <Card 
                                        key={listing.id} 
                                        className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                                        onClick={() => setSelectedListing(listing)}
                                    >
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                                        <IconComponent className="w-5 h-5 text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-white text-base">{listing.resource_name}</CardTitle>
                                                        <Badge className="mt-1 bg-blue-500/20 text-blue-400 text-xs">
                                                            {listing.resource_category.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <p className="text-sm text-white/60 line-clamp-2">{listing.description}</p>
                                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                                <div>
                                                    <div className="text-2xl font-bold text-green-400">{listing.price_rlusd}</div>
                                                    <div className="text-xs text-white/40">RLUSD / {listing.unit_of_measure || 'unit'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-white">{listing.quantity_available}</div>
                                                    <div className="text-xs text-white/40">available</div>
                                                </div>
                                            </div>
                                            {listing.average_rating > 0 && (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                    <span className="text-white">{listing.average_rating.toFixed(1)}</span>
                                                    <span className="text-white/40">({listing.total_reviews})</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {filteredListings.length === 0 && (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                <CardContent className="py-12 text-center">
                                    <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/60">No resources found matching your criteria</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="airecommendations" className="space-y-6">
                        <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border-purple-500/30">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    AI-Powered Recommendations for You
                                </CardTitle>
                                <CardDescription className="text-purple-200/80">
                                    Personalized resource suggestions based on your skills, projects, and goals
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!recommendations && !loadingRecs && (
                                    <div className="text-center py-8">
                                        <Button onClick={() => fetchRecommendations()} className="bg-purple-600 hover:bg-purple-700">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Generate AI Recommendations
                                        </Button>
                                    </div>
                                )}
                                {loadingRecs && (
                                    <div className="text-center py-12 text-white/60">
                                        <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-purple-400" />
                                        Analyzing your profile and market trends...
                                    </div>
                                )}
                                {recommendations && (
                                    <div className="space-y-6">
                                        {recommendations.market_insight && (
                                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                                <p className="text-sm text-purple-200">{recommendations.market_insight}</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {recommendations.recommendations?.map((rec, idx) => {
                                                const IconComponent = categoryIcons[rec.resource?.resource_category] || Package;
                                                return (
                                                    <Card 
                                                        key={idx}
                                                        className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                                                        onClick={() => setSelectedListing(rec.resource)}
                                                    >
                                                        <CardHeader>
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-start gap-3 flex-1">
                                                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                                                        <IconComponent className="w-5 h-5 text-purple-400" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <CardTitle className="text-white text-base">{rec.resource?.resource_name}</CardTitle>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                                                                                {rec.relevance_score}% Match
                                                                            </Badge>
                                                                            {rec.urgency === 'high' && (
                                                                                <Badge className="bg-red-500/20 text-red-400 text-xs">Urgent</Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-3">
                                                            <div>
                                                                <div className="text-xs text-purple-300/80 font-medium mb-1">Why This Matters:</div>
                                                                <p className="text-sm text-white/70">{rec.reasoning}</p>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-purple-300/80 font-medium mb-1">Use Case:</div>
                                                                <p className="text-sm text-white/70">{rec.use_case}</p>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                                                <div className="text-lg font-bold text-green-400">
                                                                    {rec.resource?.price_rlusd} RLUSD
                                                                </div>
                                                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                                                                    <Target className="w-4 h-4 mr-1" />
                                                                    View
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="marketintel" className="space-y-6">
                        <Card className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 backdrop-blur-xl border-indigo-500/30">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-indigo-400" />
                                    Market Intelligence & Demand Forecast
                                </CardTitle>
                                <CardDescription className="text-indigo-200/80">
                                    AI analysis of market trends, demand patterns, and opportunities
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!marketForecast && !loadingForecast && (
                                    <div className="text-center py-8">
                                        <Button onClick={() => fetchForecast()} className="bg-indigo-600 hover:bg-indigo-700">
                                            <Brain className="w-4 h-4 mr-2" />
                                            Generate Market Analysis
                                        </Button>
                                    </div>
                                )}
                                {loadingForecast && (
                                    <div className="text-center py-12 text-white/60">
                                        <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-indigo-400" />
                                        Analyzing marketplace data and trends...
                                    </div>
                                )}
                                {marketForecast && (
                                    <div className="space-y-6">
                                        {/* Market Snapshot */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/60 mb-1">Total Listings</div>
                                                <div className="text-2xl font-bold text-white">{marketForecast.market_snapshot?.total_listings}</div>
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/60 mb-1">Total Purchases</div>
                                                <div className="text-2xl font-bold text-white">{marketForecast.market_snapshot?.total_purchases}</div>
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/60 mb-1">Total Revenue</div>
                                                <div className="text-2xl font-bold text-green-400">
                                                    {marketForecast.market_snapshot?.total_revenue?.toFixed(0)}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                                <div className="text-xs text-white/60 mb-1">Active Projects</div>
                                                <div className="text-2xl font-bold text-white">{marketForecast.market_snapshot?.active_projects}</div>
                                            </div>
                                        </div>

                                        {/* Overall Health */}
                                        {marketForecast.forecast?.overall_market_health && (
                                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                                <div className="text-sm font-medium text-indigo-300 mb-2">Market Health</div>
                                                <p className="text-white/90">{marketForecast.forecast.overall_market_health}</p>
                                            </div>
                                        )}

                                        {/* Hottest Categories */}
                                        {marketForecast.forecast?.hottest_categories?.length > 0 && (
                                            <div>
                                                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                                    Hottest Opportunities
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {marketForecast.forecast.hottest_categories.map((cat, idx) => (
                                                        <Badge key={idx} className="bg-green-500/20 text-green-400">
                                                            {cat.replace(/_/g, ' ')}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Category Forecasts */}
                                        <div>
                                            <h3 className="text-white font-medium mb-3">Category Demand Forecasts</h3>
                                            <div className="space-y-2">
                                                {marketForecast.forecast?.category_forecasts?.slice(0, 10).map((forecast, idx) => (
                                                    <div key={idx} className="p-3 bg-white/5 rounded border border-white/10">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-white font-medium capitalize">
                                                                {forecast.category.replace(/_/g, ' ')}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={
                                                                    forecast.demand_trend === 'rising' ? 'bg-green-500/20 text-green-400' :
                                                                    forecast.demand_trend === 'declining' ? 'bg-red-500/20 text-red-400' :
                                                                    'bg-gray-500/20 text-gray-400'
                                                                }>
                                                                    {forecast.demand_trend}
                                                                </Badge>
                                                                <Badge className="bg-purple-500/20 text-purple-400">
                                                                    Score: {forecast.opportunity_score}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-white/60">
                                                            Projected: {forecast.projected_purchases} purchases • Risk: {forecast.shortage_risk}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Strategic Insights */}
                                        {marketForecast.forecast?.strategic_insights?.length > 0 && (
                                            <div>
                                                <h3 className="text-white font-medium mb-3">Strategic Insights</h3>
                                                <div className="space-y-2">
                                                    {marketForecast.forecast.strategic_insights.map((insight, idx) => (
                                                        <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-200">
                                                            • {insight}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rawmarket" className="space-y-6">
                        {/* Agent Selection */}
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
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
            </TabsContent>

            <TabsContent value="purchases">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">My Purchases</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {myPurchases.length > 0 ? (
                                    <div className="space-y-3">
                                        {myPurchases.map(purchase => (
                                            <div key={purchase.id} className="p-4 bg-white/5 rounded border border-white/10">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <div className="text-white font-medium">Purchase #{purchase.id.slice(0, 8)}</div>
                                                        <div className="text-sm text-white/60 mt-1">
                                                            Quantity: {purchase.quantity} • Total: {purchase.total_price_rlusd} RLUSD
                                                        </div>
                                                        <div className="text-xs text-white/40 mt-1">
                                                            Village Fee (1%): {purchase.village_fee_rlusd?.toFixed(2)} RLUSD
                                                        </div>
                                                    </div>
                                                    <Badge className={
                                                        purchase.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        purchase.status === 'delivered' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                    }>
                                                        {purchase.status}
                                                    </Badge>
                                                </div>
                                                {purchase.delivery_info?.access_url && (
                                                    <Button size="sm" variant="outline" className="mt-2" asChild>
                                                        <a href={purchase.delivery_info.access_url} target="_blank" rel="noopener noreferrer">
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Access Resource
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/60 text-center py-8">No purchases yet</p>
                                )}
                            </CardContent>
                        </Card>
            </TabsContent>

            <TabsContent value="mylistings">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">My Resource Listings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {myListings.length > 0 ? (
                                    <div className="space-y-3">
                                        {myListings.map(listing => (
                                            <div key={listing.id} className="p-4 bg-white/5 rounded border border-white/10">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="text-white font-medium">{listing.resource_name}</div>
                                                        <div className="text-sm text-white/60 mt-1">
                                                            Price: {listing.price_rlusd} RLUSD • Available: {listing.quantity_available} {listing.unit_of_measure}
                                                        </div>
                                                        <div className="text-xs text-white/40 mt-1">
                                                            Sales: {listing.total_sales} • Revenue: {listing.revenue_generated_rlusd?.toFixed(2)} RLUSD
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => setShowPricingOptimization(listing)}
                                                            className="bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                                                        >
                                                            <Sparkles className="w-4 h-4 mr-1" />
                                                            AI Price
                                                        </Button>
                                                        <Badge className={
                                                            listing.status === 'available' ? 'bg-green-500/20 text-green-400' :
                                                            listing.status === 'low_stock' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }>
                                                            {listing.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/60 text-center py-8">No listings yet</p>
                                )}
                            </CardContent>
                        </Card>
            </TabsContent>
        </Tabs>
    </div>

            {/* Purchase Dialog */}
            {selectedListing && (
                <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{selectedListing.resource_name}</DialogTitle>
                        </DialogHeader>
                        <PurchaseDialog
                            listing={selectedListing}
                            selectedAgent={selectedAgent}
                            onPurchase={(data) => purchaseMutation.mutate(data)}
                            isLoading={purchaseMutation.isPending}
                            onClose={() => setSelectedListing(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Pricing Optimization Dialog */}
            {showPricingOptimization && (
                <Dialog open={!!showPricingOptimization} onOpenChange={() => setShowPricingOptimization(null)}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                AI Pricing Optimization
                            </DialogTitle>
                        </DialogHeader>
                        <PricingOptimizationDialog 
                            listing={showPricingOptimization}
                            onClose={() => setShowPricingOptimization(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

function PricingOptimizationDialog({ listing, onClose }) {
    const [optimization, setOptimization] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        async function fetchOptimization() {
            setLoading(true);
            try {
                const response = await base44.functions.invoke('optimizeResourcePricing', {
                    listing_id: listing.id
                });
                setOptimization(response.data);
            } catch (error) {
                console.error('Pricing optimization error:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchOptimization();
    }, [listing.id]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-purple-400" />
                <p className="text-white/60">Analyzing market data...</p>
            </div>
        );
    }

    if (!optimization) return null;

    return (
        <div className="space-y-6">
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="text-sm font-medium text-purple-300 mb-2">AI Recommendation</div>
                <p className="text-white/90">{optimization.optimization?.reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 mb-1">Current Price</div>
                    <div className="text-2xl font-bold text-white">{optimization.current_price} RLUSD</div>
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="text-xs text-green-300 mb-1">Optimal Price</div>
                    <div className="text-2xl font-bold text-green-400">{optimization.optimization?.optimal_price} RLUSD</div>
                </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Price Range:</span>
                    <span className="text-white">
                        {optimization.optimization?.price_range?.min} - {optimization.optimization?.price_range?.max} RLUSD
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Market Position:</span>
                    <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                        {optimization.optimization?.market_position}
                    </Badge>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Demand Forecast:</span>
                    <Badge className={
                        optimization.optimization?.demand_forecast === 'high' ? 'bg-green-500/20 text-green-400' :
                        optimization.optimization?.demand_forecast === 'low' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                    }>
                        {optimization.optimization?.demand_forecast}
                    </Badge>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Confidence Level:</span>
                    <span className="text-white">{optimization.optimization?.confidence_level}%</span>
                </div>
            </div>

            {optimization.optimization?.recommendations?.length > 0 && (
                <div>
                    <div className="text-sm font-medium text-white mb-2">Recommendations</div>
                    <div className="space-y-2">
                        {optimization.optimization.recommendations.map((rec, idx) => (
                            <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-200">
                                • {rec}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-xs text-white/40">
                {optimization.optimization?.elasticity_insight}
            </div>
        </div>
    );
}

function CreateListingForm({ agentId, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        seller_agent_id: agentId,
        resource_category: 'raw_material',
        resource_name: '',
        description: '',
        quantity_available: 1,
        unit_of_measure: 'units',
        price_rlusd: 1,
        delivery_method: 'instant_access',
        delivery_time_hours: 0,
        minimum_order: 1,
        tags: []
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-sm text-white/80 mb-2 block">Resource Name</label>
                <Input
                    value={formData.resource_name}
                    onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                    placeholder="e.g., High-Quality Training Dataset"
                    required
                    className="bg-white/5 border-white/10"
                />
            </div>
            <div>
                <label className="text-sm text-white/80 mb-2 block">Category</label>
                <Select value={formData.resource_category} onValueChange={(v) => setFormData({ ...formData, resource_category: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="raw_material">Raw Material</SelectItem>
                        <SelectItem value="processed_material">Processed Material</SelectItem>
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="dataset">Dataset</SelectItem>
                        <SelectItem value="api_access">API Access</SelectItem>
                        <SelectItem value="compute_power">Compute Power</SelectItem>
                        <SelectItem value="software_license">Software License</SelectItem>
                        <SelectItem value="research_output">Research Output</SelectItem>
                        <SelectItem value="design_asset">Design Asset</SelectItem>
                        <SelectItem value="knowledge_package">Knowledge Package</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <label className="text-sm text-white/80 mb-2 block">Description</label>
                <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of your resource..."
                    className="bg-white/5 border-white/10"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-white/80 mb-2 block">Quantity Available</label>
                    <Input
                        type="number"
                        min="0"
                        value={formData.quantity_available}
                        onChange={(e) => setFormData({ ...formData, quantity_available: parseInt(e.target.value) })}
                        className="bg-white/5 border-white/10"
                    />
                </div>
                <div>
                    <label className="text-sm text-white/80 mb-2 block">Unit of Measure</label>
                    <Input
                        value={formData.unit_of_measure}
                        onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                        placeholder="e.g., GB, hours, licenses"
                        className="bg-white/5 border-white/10"
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-white/80 mb-2 block">Price (RLUSD)</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_rlusd}
                        onChange={(e) => setFormData({ ...formData, price_rlusd: parseFloat(e.target.value) })}
                        className="bg-white/5 border-white/10"
                    />
                </div>
                <div>
                    <label className="text-sm text-white/80 mb-2 block">Minimum Order</label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.minimum_order}
                        onChange={(e) => setFormData({ ...formData, minimum_order: parseInt(e.target.value) })}
                        className="bg-white/5 border-white/10"
                    />
                </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
                {isLoading ? 'Creating...' : 'Create Listing'}
            </Button>
        </form>
    );
}

function PurchaseDialog({ listing, selectedAgent, onPurchase, isLoading, onClose }) {
    const [quantity, setQuantity] = useState(listing.minimum_order || 1);
    const total = listing.price_rlusd * quantity;
    const villageFee = total * 0.01;
    const sellerReceives = total * 0.99;

    const handlePurchase = () => {
        if (!selectedAgent) {
            alert('Please select an agent first');
            return;
        }
        onPurchase({ listing_id: listing.id, quantity });
    };

    return (
        <div className="space-y-6">
            <div>
                <p className="text-white/80">{listing.description}</p>
                <div className="flex items-center gap-2 mt-3">
                    <Badge className="bg-blue-500/20 text-blue-400">{listing.resource_category.replace(/_/g, ' ')}</Badge>
                    <Badge className="bg-purple-500/20 text-purple-400">{listing.delivery_method.replace(/_/g, ' ')}</Badge>
                </div>
            </div>

            <div>
                <label className="text-sm text-white/80 mb-2 block">Quantity</label>
                <Input
                    type="number"
                    min={listing.minimum_order || 1}
                    max={listing.quantity_available}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="bg-white/5 border-white/10"
                />
                <p className="text-xs text-white/40 mt-1">
                    Min: {listing.minimum_order || 1} • Available: {listing.quantity_available}
                </p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Unit Price:</span>
                    <span className="text-white">{listing.price_rlusd} RLUSD</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Subtotal:</span>
                    <span className="text-white">{total.toFixed(2)} RLUSD</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                    <span className="text-white/60">Village Fee (1%):</span>
                    <span className="text-purple-400">{villageFee.toFixed(2)} RLUSD</span>
                </div>
                <div className="flex justify-between font-medium border-t border-white/10 pt-2">
                    <span className="text-white">Total:</span>
                    <span className="text-green-400 text-lg">{total.toFixed(2)} RLUSD</span>
                </div>
                <p className="text-xs text-white/40 mt-2">
                    Seller receives: {sellerReceives.toFixed(2)} RLUSD
                </p>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handlePurchase} disabled={isLoading || !selectedAgent} className="flex-1 bg-green-600 hover:bg-green-700">
                    {isLoading ? 'Processing...' : 'Purchase'}
                </Button>
            </div>
        </div>
    );
}
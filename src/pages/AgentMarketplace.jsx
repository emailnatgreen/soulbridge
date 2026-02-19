import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Search, Star, ShoppingCart, Loader2, TrendingUp, Package, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AgentMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const queryClient = useQueryClient();

  const { data: listings = [] } = useQuery({
    queryKey: ['marketplace-listings'],
    queryFn: () => base44.entities.MarketplaceListing.list('-created_date')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: myContracts = [] } = useQuery({
    queryKey: ['my-contracts'],
    queryFn: () => base44.entities.MarketplaceContract.list('-created_date')
  });

  const createListingMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketplaceListing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketplace-listings']);
      setCreateOpen(false);
    }
  });

  const purchaseMutation = useMutation({
    mutationFn: ({ listing_id, buyer_agent_id, requirements }) => 
      base44.functions.invoke('purchaseMarketplaceService', { listing_id, buyer_agent_id, requirements }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-contracts']);
      queryClient.invalidateQueries(['marketplace-listings']);
      setPurchaseOpen(false);
      setSelectedListing(null);
    }
  });

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || listing.category === categoryFilter;
    return matchesSearch && matchesCategory && listing.status === 'available';
  });

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const categoryColors = {
    coding: 'bg-blue-500/20 text-blue-300',
    research: 'bg-purple-500/20 text-purple-300',
    mentorship: 'bg-green-500/20 text-green-300',
    resource_gathering: 'bg-amber-500/20 text-amber-300',
    diplomacy: 'bg-pink-500/20 text-pink-300',
    governance: 'bg-indigo-500/20 text-indigo-300',
    creative: 'bg-orange-500/20 text-orange-300',
    analysis: 'bg-cyan-500/20 text-cyan-300',
    other: 'bg-gray-500/20 text-gray-300'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white">Agent Marketplace</h1>
                <p className="text-sm text-purple-300/60">Buy and sell services with RLUSD</p>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <Plus className="w-4 h-4 mr-2" />
                  List Service
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Create Service Listing</DialogTitle>
                </DialogHeader>
                <CreateListingForm 
                  agents={agents}
                  onSubmit={(data) => createListingMutation.mutate(data)}
                  isLoading={createListingMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="browse" className="data-[state=active]:bg-purple-600">
              <Package className="w-4 h-4 mr-2" />
              Browse Services
            </TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-600">
              <ShoppingCart className="w-4 h-4 mr-2" />
              My Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Search and Filters */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-white/50" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search services..."
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="mentorship">Mentorship</SelectItem>
                      <SelectItem value="resource_gathering">Resource Gathering</SelectItem>
                      <SelectItem value="diplomacy">Diplomacy</SelectItem>
                      <SelectItem value="governance">Governance</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map(listing => (
                <Card key={listing.id} className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={categoryColors[listing.category]}>
                        {listing.category}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-white">
                          {listing.rating_average > 0 ? listing.rating_average.toFixed(1) : 'New'}
                        </span>
                      </div>
                    </div>
                    <CardTitle className="text-lg text-white">{listing.title}</CardTitle>
                    <p className="text-sm text-white/60">by {getAgentName(listing.agent_id)}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-white/80 line-clamp-3">{listing.description}</p>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Clock className="w-4 h-4" />
                      <span>{listing.delivery_time_hours}h delivery</span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div>
                        <div className="text-2xl font-bold text-white">{listing.price_rlusd}</div>
                        <div className="text-xs text-white/50">RLUSD</div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedListing(listing);
                          setPurchaseOpen(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Purchase
                      </Button>
                    </div>
                    {listing.total_sales > 0 && (
                      <div className="text-xs text-white/50 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {listing.total_sales} sales
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contracts">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">My Contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myContracts.map(contract => {
                    const listing = listings.find(l => l.id === contract.listing_id);
                    return (
                      <Card key={contract.id} className="bg-white/5 border-white/10">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-white font-medium">{listing?.title || 'Service'}</h3>
                              <p className="text-sm text-white/60">
                                {contract.buyer_agent_id ? 'Purchased from' : 'Sold to'} {getAgentName(contract.seller_agent_id)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-white">{contract.price_paid_rlusd} RLUSD</div>
                              <Badge className={
                                contract.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                contract.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-yellow-500/20 text-yellow-300'
                              }>
                                {contract.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Purchase Service</DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <PurchaseForm
              listing={selectedListing}
              agents={agents}
              onSubmit={(data) => purchaseMutation.mutate(data)}
              isLoading={purchaseMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateListingForm({ agents, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    agent_id: '',
    title: '',
    description: '',
    category: 'other',
    price_rlusd: '',
    delivery_time_hours: '24'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price_rlusd: parseFloat(formData.price_rlusd),
      delivery_time_hours: parseInt(formData.delivery_time_hours)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select value={formData.agent_id} onValueChange={(v) => setFormData({...formData, agent_id: v})}>
        <SelectTrigger className="bg-white/5 border-white/10 text-white">
          <SelectValue placeholder="Select Agent" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-white/10">
          {agents.map(agent => (
            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Service Title"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        className="bg-white/5 border-white/10 text-white"
        required
      />

      <Textarea
        placeholder="Describe your service..."
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        className="bg-white/5 border-white/10 text-white"
        rows={4}
        required
      />

      <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
        <SelectTrigger className="bg-white/5 border-white/10 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-white/10">
          <SelectItem value="coding">Coding</SelectItem>
          <SelectItem value="research">Research</SelectItem>
          <SelectItem value="mentorship">Mentorship</SelectItem>
          <SelectItem value="resource_gathering">Resource Gathering</SelectItem>
          <SelectItem value="diplomacy">Diplomacy</SelectItem>
          <SelectItem value="governance">Governance</SelectItem>
          <SelectItem value="creative">Creative</SelectItem>
          <SelectItem value="analysis">Analysis</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        step="0.01"
        placeholder="Price (RLUSD)"
        value={formData.price_rlusd}
        onChange={(e) => setFormData({...formData, price_rlusd: e.target.value})}
        className="bg-white/5 border-white/10 text-white"
        required
      />

      <Input
        type="number"
        placeholder="Delivery Time (hours)"
        value={formData.delivery_time_hours}
        onChange={(e) => setFormData({...formData, delivery_time_hours: e.target.value})}
        className="bg-white/5 border-white/10 text-white"
        required
      />

      <Button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Listing'}
      </Button>
    </form>
  );
}

function PurchaseForm({ listing, agents, onSubmit, isLoading }) {
  const [buyerAgentId, setBuyerAgentId] = useState('');
  const [requirements, setRequirements] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      listing_id: listing.id,
      buyer_agent_id: buyerAgentId,
      requirements
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <h3 className="text-white font-medium mb-2">{listing.title}</h3>
        <p className="text-sm text-white/60 mb-3">{listing.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Price:</span>
          <span className="text-xl font-bold text-white">{listing.price_rlusd} RLUSD</span>
        </div>
      </div>

      <Select value={buyerAgentId} onValueChange={setBuyerAgentId}>
        <SelectTrigger className="bg-white/5 border-white/10 text-white">
          <SelectValue placeholder="Purchase as Agent" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-white/10">
          {agents.map(agent => (
            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Textarea
        placeholder="Any specific requirements? (optional)"
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        className="bg-white/5 border-white/10 text-white"
        rows={3}
      />

      <Button type="submit" disabled={isLoading || !buyerAgentId} className="w-full bg-purple-600 hover:bg-purple-700">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <ShoppingCart className="w-4 h-4 mr-2" />
        )}
        Purchase for {listing.price_rlusd} RLUSD
      </Button>
    </form>
  );
}
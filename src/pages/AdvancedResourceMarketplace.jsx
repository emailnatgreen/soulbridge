import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ShoppingCart, Gavel, TrendingUp, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdvancedResourceMarketplace() {
  const [selectedResource, setSelectedResource] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [filterType, setFilterType] = useState('all');
  const queryClient = useQueryClient();

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['marketplace_resources'],
    queryFn: () => base44.entities.MarketplaceResource.list('-created_date', 100),
  });

  // Fetch current user's agent
  const { data: userAgent } = useQuery({
    queryKey: ['user_agent'],
    queryFn: async () => {
      const agents = await base44.entities.Agent.filter({ created_by: await base44.auth.me() });
      return agents[0];
    },
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: (resourceId) => base44.functions.invoke('processMarketplaceTransaction', {
      resourceId,
      buyerAgentId: userAgent?.id,
      purchaseType: 'fixed'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace_resources'] });
      toast.success('Purchase successful! Transaction recorded on ledger.');
      setSelectedResource(null);
    },
    onError: (error) => {
      toast.error(`Purchase failed: ${error.message}`);
    }
  });

  // Bid mutation
  const bidMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('processMarketplaceTransaction', {
      resourceId: data.resourceId,
      buyerAgentId: userAgent?.id,
      bidAmount: data.bidAmount,
      purchaseType: 'bid'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace_resources'] });
      toast.success('Bid placed successfully!');
      setBidAmount('');
      setSelectedResource(null);
    },
    onError: (error) => {
      toast.error(`Bid failed: ${error.message}`);
    }
  });

  const filteredResources = filterType === 'all' 
    ? resources 
    : resources.filter(r => r.resource_type === filterType);

  const getResourceIcon = (type) => {
    const icons = {
      quantum_data_package: '📊',
      optimization_protocol: '⚙️',
      compliance_template: '✅',
      audit_report: '📋'
    };
    return icons[type] || '📦';
  };

  const getStatusBadgeVariant = (status) => {
    if (status === 'sold') return 'secondary';
    if (status === 'auction_active') return 'default';
    return 'outline';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-light text-white">Advanced Resource Marketplace</h1>
          </div>
          <p className="text-purple-300/60">Trade skills, data, and expertise within the Village</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300/60 text-sm mb-1">Total Resources</p>
                  <p className="text-3xl font-light text-white">{resources.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300/60 text-sm mb-1">Available Now</p>
                  <p className="text-3xl font-light text-white">
                    {resources.filter(r => r.status === 'listed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-300/60 text-sm mb-1">Active Auctions</p>
                  <p className="text-3xl font-light text-white">
                    {resources.filter(r => r.status === 'auction_active').length}
                  </p>
                </div>
                <Gavel className="w-8 h-8 text-indigo-400/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Tabs value={filterType} onValueChange={setFilterType}>
            <TabsList className="bg-white/5 border-white/10">
              <TabsTrigger value="all">All Resources</TabsTrigger>
              <TabsTrigger value="quantum_data_package">Quantum Data</TabsTrigger>
              <TabsTrigger value="optimization_protocol">Optimization</TabsTrigger>
              <TabsTrigger value="compliance_template">Compliance</TabsTrigger>
              <TabsTrigger value="audit_report">Audit Reports</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="text-center text-purple-300/60 py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            Loading marketplace...
          </div>
        ) : filteredResources.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-400/50 mx-auto mb-3" />
              <p className="text-purple-300/60">No resources available in this category</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-all cursor-pointer"
                onClick={() => setSelectedResource(resource)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{getResourceIcon(resource.resource_type)}</span>
                    <Badge variant={getStatusBadgeVariant(resource.status)}>
                      {resource.status === 'auction_active' ? '🔨 Auction' : resource.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-white">{resource.title}</CardTitle>
                  <CardDescription className="text-purple-300/60 text-sm line-clamp-2">
                    {resource.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-purple-300/60 text-xs mb-1">Price</p>
                    <p className="text-2xl font-light text-emerald-400">
                      {resource.payment_method === 'PAYPAL_FIAT'
                        ? `$${((resource.unit_amount || 0) / 100).toFixed(2)}`
                        : resource.unit_amount
                          ? `${resource.unit_amount} RLUSD`
                          : `${(resource.price_drops / 1000000).toFixed(2)} XRP`}
                    </p>
                    {resource.status === 'legacy' && (
                      <p className="text-amber-400 text-xs mt-1">⚠ Legacy pricing — read-only</p>
                    )}
                  </div>

                  {resource.allow_bidding && resource.current_highest_bid_drops && (
                    <div>
                      <p className="text-purple-300/60 text-xs mb-1">Current Highest Bid</p>
                      <p className="text-lg font-light text-indigo-400">
                        {(resource.current_highest_bid_drops / 1000000).toFixed(2)} XRP
                      </p>
                    </div>
                  )}

                  {resource.royalty_recipients && resource.royalty_recipients.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-purple-300/60">
                      <Lock className="w-3 h-3" />
                      {resource.royalty_recipients.length} co-creator royalties
                    </div>
                  )}

                  <Dialog open={selectedResource?.id === resource.id} onOpenChange={(open) => !open && setSelectedResource(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedResource(resource);
                        }}
                        disabled={resource.status === 'sold' || resource.status === 'legacy' || !userAgent}
                      >
                        {resource.status === 'sold' ? 'Sold Out' : resource.status === 'legacy' ? 'Legacy' : resource.allow_bidding ? '🔨 Place Bid' : '🛒 Purchase'}
                      </Button>
                    </DialogTrigger>

                    {selectedResource?.id === resource.id && (
                      <DialogContent className="bg-slate-900 border-white/10">
                        <DialogHeader>
                          <DialogTitle className="text-white">{resource.title}</DialogTitle>
                          <DialogDescription className="text-purple-300/60">
                            {resource.description}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 my-6">
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-purple-300/60 text-sm mb-2">Price</p>
                            <p className="text-3xl font-light text-emerald-400">
                              {(resource.price_drops / 1000000).toFixed(2)} XRP
                            </p>
                          </div>

                          {resource.allow_bidding && (
                            <div className="space-y-2">
                              <label className="text-purple-300/60 text-sm">Your Bid (XRP)</label>
                              <Input
                                type="number"
                                placeholder="Enter bid amount"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                                min={(resource.current_highest_bid_drops / 1000000).toFixed(2)}
                              />
                            </div>
                          )}

                          {resource.royalty_recipients && resource.royalty_recipients.length > 0 && (
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                              <p className="text-xs text-indigo-300/80 mb-2">Co-Creator Royalties</p>
                              <div className="space-y-1">
                                {resource.royalty_recipients.map((recipient, idx) => (
                                  <p key={idx} className="text-xs text-indigo-300/60">
                                    {recipient.agent_id}: {recipient.percentage}%
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            if (resource.allow_bidding) {
                              bidMutation.mutate({
                                resourceId: resource.id,
                                bidAmount: parseFloat(bidAmount) * 1000000
                              });
                            } else {
                              purchaseMutation.mutate(resource.id);
                            }
                          }}
                          disabled={purchaseMutation.isPending || bidMutation.isPending || (resource.allow_bidding && !bidAmount)}
                        >
                          {purchaseMutation.isPending || bidMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : resource.allow_bidding ? (
                            'Place Bid'
                          ) : (
                            'Complete Purchase'
                          )}
                        </Button>
                      </DialogContent>
                    )}
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
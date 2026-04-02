import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Copy, CheckCircle, ExternalLink, User, Fingerprint, FileJson, AlertTriangle, Shield, Clock, Info, UserPlus, Edit3, History, Search, Activity, Link2, Upload, Sparkles, Home, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AgentManagementDialog from '../components/AgentManagementDialog';
import AuditLogViewer from '../components/AuditLogViewer';
import DidResolverTool from '../components/DidResolverTool';
import DidDocumentEditor from '../components/DidDocumentEditor';
import WalletQRCode from '../components/WalletQRCode';
import DidReputationScore from '../components/DidReputationScore';
import PublishDIDDialog from '../components/PublishDIDDialog';
import AskAxiButton from '../components/AskAxiButton';
import DidReviewPanel from '../components/DidReviewPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DIDManager() {
  const queryClient = useQueryClient();
  usePageSignal();
  const [selectedDID, setSelectedDID] = useState(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [verificationResults, setVerificationResults] = useState({});
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [currentVerification, setCurrentVerification] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedWalletForRequest, setSelectedWalletForRequest] = useState(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedWalletForPublish, setSelectedWalletForPublish] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState(null);
  const [verifyingWalletId, setVerifyingWalletId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets', user?.id, user?.role],
    queryFn: async () => {
      const list = user?.role === 'admin'
        ? await base44.entities.Wallet.list('-created_date', 100)
        : await base44.entities.Wallet.filter({ owner_id: user?.id });
      // Sync live balances for treasury wallet
      return Promise.all(list.map(async (w) => {
        if (w.classic_address === 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h') {
          try {
            const res = await base44.functions.invoke('getBalance', { wallet_id: w.id });
            if (res.data?.balance !== undefined) return { ...w, balance: res.data.balance };
          } catch (e) {}
        }
        return w;
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // NOTE: Revoke/Reverse functions don't exist - DIDs are managed via governance proposals

  const linkMutation = useMutation({
    mutationFn: ({ agent_id, wallet_id }) => 
      base44.functions.invoke('linkAgentToDID', { agent_id, wallet_id }),
    onSuccess: () => {
      toast.success('Agent successfully linked to DID');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setLinkDialogOpen(false);
      setSelectedAgent('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to link agent');
    }
  });

  // NOTE: Agents cannot be unlinked from wallets - wallet_id is required in Agent schema

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getAgentForWallet = (walletId) => {
    return agents.find(agent => agent.wallet_id === walletId);
  };

  const isRevoked = (wallet) => {
    return wallet.notes && wallet.notes.includes('[DID REVOKED:');
  };

  const getUnlinkedAgents = () => {
    return agents.filter(agent => !agent.wallet_id);
  };

  const getDIDDocument = (wallet) => {
    const agent = getAgentForWallet(wallet.id);
    return {
      "@context": "https://www.w3.org/ns/did/v1",
      "id": `did:xrpl:${wallet.classic_address}`,
      "alsoKnownAs": [agent?.name || wallet.name || 'SoulBridge Citizen'],
      "controller": wallet.classic_address,
      "verificationMethod": [{
        "id": `did:xrpl:${wallet.classic_address}#keys-1`,
        "type": "EcdsaSecp256k1VerificationKey2019",
        "controller": `did:xrpl:${wallet.classic_address}`,
        "publicKeyBase58": wallet.classic_address
      }],
      "authentication": [`did:xrpl:${wallet.classic_address}#keys-1`],
      "service": [{
        "id": `did:xrpl:${wallet.classic_address}#soulbridge`,
        "type": "SoulBridgeProfile",
        "serviceEndpoint": "https://soulbridge.base44.app",
        "description": agent?.purpose || "SoulBridge Village Citizen"
      }],
      "created": wallet.created_date,
      "updated": wallet.updated_date
    };
  };



  const handleLinkAgent = (walletId) => {
    if (selectedAgent) {
      linkMutation.mutate({ agent_id: selectedAgent, wallet_id: walletId });
    }
  };

  const verifyMutation = useMutation({
    mutationFn: (walletId) => base44.functions.invoke('verifyDIDStatus', { wallet_id: walletId }),
    onSuccess: (response, walletId) => {
      const data = response.data || response;
      setVerificationResults(prev => ({
        ...prev,
        [walletId]: data
      }));
      setCurrentVerification(data);
      setVerifyDialogOpen(true);
      
      const v = data?.verification;
      if (!v || !v.account_exists) {
        toast.error('Account not found on XRPL mainnet. Fund this address with at least 20 XRP to activate it.');
      } else if (v?.did_active) {
        toast.success('✅ DID is published on XRPL');
      } else {
        toast.warning('⚠️ Account exists but DID is not published on-chain');
      }
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error?.message || error?.error || 'Failed to verify DID';
      toast.error(message);
      console.error('Verification error:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (walletId) => base44.entities.Wallet.delete(walletId),
    onSuccess: () => {
      toast.success('DID deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setDeleteDialogOpen(false);
      setWalletToDelete(null);
    },
    onError: () => toast.error('Failed to delete DID')
  });

  const requestActivationMutation = useMutation({
    mutationFn: ({ wallet_id, agent_id }) => 
      base44.functions.invoke('createDidActivationProposal', { wallet_id, agent_id }),
    onSuccess: (response) => {
      toast.success('DID activation proposal submitted to governance');
      setRequestDialogOpen(false);
      setSelectedWalletForRequest(null);
      queryClient.invalidateQueries(['wallets']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit activation proposal');
      console.error('Proposal error:', error);
    }
  });

  const handleVerifyDID = (walletId) => {
    verifyMutation.mutate(walletId);
  };

  const handlePostPublishVerify = (walletId) => {
    // Wait 4s for XRPL to propagate then auto-verify
    setTimeout(() => {
      verifyMutation.mutate(walletId);
    }, 4000);
  };

  const getVerificationBadge = (wallet) => {
    // First check persistent database state
    if (wallet.is_published) {
      return <Badge className="bg-green-600">✅ Published on XRPL</Badge>;
    }

    // Fall back to recent verification results
    const result = verificationResults[wallet.id];
    if (!result) return null;

    const verification = result.verification;
    if (!verification.account_exists) {
      return <Badge variant="outline" className="text-red-600">❌ Not on Chain</Badge>;
    }
    if (!verification.did_active) {
      return <Badge variant="outline" className="text-yellow-600">⚠️ Not Published</Badge>;
    }
    return <Badge className="bg-green-600">✅ Published on XRPL</Badge>;
  };

  // Separate wallets into active and revoked - only include wallets with a classic_address (proper DIDs)
  const activeWallets = wallets.filter(w => !w.notes?.includes('REVOKED') && w.classic_address);
  const revokedWallets = wallets.filter(w => w.notes?.includes('REVOKED') && w.classic_address);

  const getRevocationInfo = (wallet) => {
    if (!wallet.notes?.includes('REVOKED')) return null;
    
    const match = wallet.notes.match(/REVOKED at (.*?)(?:\. Reason: (.*))?$/);
    if (match) {
      return {
        timestamp: match[1],
        reason: match[2] || 'No reason provided'
      };
    }
    return { timestamp: 'Unknown', reason: 'Unknown' };
  };

  if (walletsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DIDs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/Home">
            <Button variant="outline" className="mb-4 gap-2">
              <Home className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">DID Manager</h1>
              <p className="text-gray-600">Decentralized Identifiers on XRPL</p>
              <Badge className="mt-2 bg-purple-600">World's First XRPL DID Manager</Badge>
            </div>
            <div className="flex items-center gap-2">
              <DidResolverTool 
                trigger={
                  <Button size="sm" variant="outline">
                    <Search className="w-3 h-3 mr-2" />
                    Resolve
                  </Button>
                }
              />
              <Link to={createPageUrl('DIDHealthDashboard')}>
                <Button size="sm" variant="outline">
                  <Activity className="w-3 h-3 mr-2" />
                  Health
                </Button>
              </Link>
              <Link to="/Axi">
                <Button size="sm" variant="outline">
                  <Sparkles className="w-3 h-3 mr-2" />
                  Axi
                </Button>
              </Link>
              <Link to={createPageUrl('CreateDID')}>
                <Button size="sm">
                  <Fingerprint className="w-3 h-3 mr-2" />
                  New DID
                </Button>
              </Link>
              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-indigo-600">{wallets.length}</div>
                <div className="text-xs text-gray-600">DIDs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Review Panel */}
        <DidReviewPanel 
          wallets={wallets}
          agents={agents}
          activeWallets={activeWallets}
          revokedWallets={revokedWallets}
        />

        {/* DID Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
          <TabsList className="bg-slate-100 border border-slate-200 p-1 rounded-xl flex gap-1 h-auto w-fit">
            {[
              { value: 'active', label: 'Active DIDs', icon: CheckCircle, count: activeWallets.length, gradient: 'from-indigo-600 to-purple-600' },
              { value: 'revoked', label: 'Revoked DIDs', icon: AlertTriangle, count: revokedWallets.length, gradient: 'from-red-500 to-orange-500' },
            ].map(({ value, label, icon: Icon, count, gradient }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  text-slate-500 hover:text-slate-800
                  data-[state=active]:bg-gradient-to-r data-[state=active]:${gradient}
                  data-[state=active]:text-white data-[state=active]:shadow-md`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">
                  {count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Active DIDs Tab */}
           <TabsContent value="active" className="mt-6">
             {activeWallets.length === 0 ? (
               <Card className="bg-gray-50">
                 <CardContent className="py-12 text-center">
                   <Fingerprint className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                   <p className="text-gray-600">No active DIDs found</p>
                   <p className="text-sm text-gray-500 mt-2">DIDs are created via governance activation with an associated agent.</p>
                   <Link to={createPageUrl('CreateDID')} className="mt-4 inline-block">
                     <Button>Create New DID</Button>
                   </Link>
                 </CardContent>
               </Card>
             ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {activeWallets.map((wallet) => {
                  const agent = getAgentForWallet(wallet.id);
                  const didAddress = `did:xrpl:${wallet.classic_address}`;
                  const didDoc = getDIDDocument(wallet);
                  
                  return (
                    <Card key={wallet.id} className="hover:shadow-lg transition-shadow border-green-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Fingerprint className="w-5 h-5 text-indigo-600" />
                              {(() => { const a = getAgentForWallet(wallet.id); return a ? `${a.name}'s DID` : (wallet.name || 'Unnamed Wallet'); })()}
                            </CardTitle>
                            <Badge variant="outline" className="mt-2">
                              {wallet.network}
                            </Badge>
                          </div>
                          <Badge className="bg-green-600">Active</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* DID Address */}
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">DID Address</div>
                          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                            <code className="text-xs flex-1 overflow-hidden text-ellipsis">
                              {didAddress}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(didAddress, 'DID Address')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Classic Address */}
                        <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">XRPL Address</div>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                        <code className="text-xs flex-1 overflow-hidden text-ellipsis">
                          {wallet.classic_address}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(wallet.classic_address, 'Address')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      </div>

                      {/* Reputation Score */}
                      {agent && (
                        <div className="border-t pt-4">
                          <DidReputationScore agentId={agent.id} compact={false} />
                        </div>
                      )}

                      {/* Agent Profile */}
                      {agent ? (
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Associated Agent
                          </span>
                          <div className="flex gap-1">
                            <AgentManagementDialog 
                              mode="edit"
                              existingAgent={agent}
                              trigger={
                                <Button size="sm" variant="ghost">
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              }
                              onSuccess={() => queryClient.invalidateQueries(['agents'])}
                            />

                          </div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-md space-y-2">
                          <div>
                            <div className="font-medium text-indigo-900">{agent.name}</div>
                            {agent.tagline && (
                              <div className="text-xs text-indigo-600 italic">{agent.tagline}</div>
                            )}
                            <Badge variant="outline" className="mt-1 text-xs">{agent.role}</Badge>
                          </div>
                          <div className="text-xs text-indigo-600 line-clamp-2">
                            {agent.purpose}
                          </div>
                          {(agent.metadata?.contact_email || agent.metadata?.contact_phone) && (
                            <div className="text-xs text-indigo-700 pt-2 border-t border-indigo-200">
                              {agent.metadata?.contact_email && (
                                <div>📧 {agent.metadata.contact_email}</div>
                              )}
                              {agent.metadata?.contact_phone && (
                                <div>📞 {agent.metadata.contact_phone}</div>
                              )}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Link to={createPageUrl('AgentDetails') + `?id=${agent.id}`} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full">
                                View Details <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-4 space-y-2">
                        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full">
                              <Link2 className="w-3 h-3 mr-2" />
                              Link Existing Agent
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Link Agent to DID</DialogTitle>
                              <DialogDescription>
                                Select an existing agent or create a new one
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an agent" />
                                </SelectTrigger>
                                <SelectContent>
                                  {agents.filter(a => a.status === 'active').map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                      {a.name} ({a.role})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => handleLinkAgent(wallet.id)}
                                disabled={!selectedAgent || linkMutation.isPending}
                              >
                                {linkMutation.isPending ? 'Linking...' : 'Link Agent'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <AgentManagementDialog 
                          mode="create"
                          trigger={
                            <Button size="sm" variant="outline" className="w-full">
                              <UserPlus className="w-3 h-3 mr-2" />
                              Create & Link New Agent
                            </Button>
                          }
                          onSuccess={(newAgent) => {
                            if (newAgent.wallet_id === wallet.id) {
                              queryClient.invalidateQueries(['agents']);
                            }
                          }}
                        />
                      </div>
                      )}

                          {/* QR Codes */}
                          <div className="border-t pt-4">
                            <WalletQRCode wallet={wallet} currentUser={user} />
                          </div>

                          {/* Verification Status */}
                          {getVerificationBadge(wallet) && (
                          <div className="border-t pt-4">
                          <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Last Verification:</span>
                          {getVerificationBadge(wallet)}
                          </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {verificationResults[wallet.id]?.verification?.verified_at
                            ? new Date(verificationResults[wallet.id].verification.verified_at).toLocaleString()
                            : wallet.published_at
                            ? new Date(wallet.published_at).toLocaleString()
                            : null}
                          </div>
                          </div>
                          )}

                          {/* Actions */}
                          <div className="border-t pt-4 space-y-2">
                          <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleVerifyDID(wallet.id)}
                        disabled={verifyMutation.isPending}
                        >
                        <Shield className="w-3 h-3 mr-2" />
                        {verifyMutation.isPending ? 'Verifying...' : 'Verify on XRPL'}
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                           <AuditLogViewer 
                             wallet={wallet}
                             trigger={
                               <Button size="sm" variant="outline" className="w-full">
                                 <History className="w-3 h-3 mr-2" />
                                 Audit Log
                               </Button>
                             }
                           />
                           <DidDocumentEditor
                             wallet={wallet}
                             didDocument={didDoc}
                             trigger={
                               <Button size="sm" variant="outline" className="w-full">
                                 <FileJson className="w-3 h-3 mr-2" />
                                 View Doc
                               </Button>
                             }
                           />
                         </div>

                        <div className="flex flex-col gap-2">

                           <Dialog open={requestDialogOpen && selectedWalletForRequest?.id === wallet.id} 
                                   onOpenChange={(open) => {
                                     setRequestDialogOpen(open);
                                     if (!open) setSelectedWalletForRequest(null);
                                   }}>
                             <DialogTrigger asChild>
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 className="w-full"
                                 onClick={() => setSelectedWalletForRequest(wallet)}
                               >
                                 📋 Request Activation
                               </Button>
                             </DialogTrigger>
                             <DialogContent>
                               <DialogHeader>
                                 <DialogTitle>Request DID Activation</DialogTitle>
                                 <DialogDescription>
                                   Submit a governance proposal for DID activation. Quad members will vote on your request.
                                 </DialogDescription>
                               </DialogHeader>
                               <div className="space-y-4 py-4">
                                 <div>
                                   <div className="text-sm font-medium text-gray-700">DID Address</div>
                                   <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                     did:xrpl:{wallet.classic_address}
                                   </div>
                                 </div>
                                 {agent && (
                                   <div>
                                     <div className="text-sm font-medium text-gray-700">Associated Agent</div>
                                     <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                       {agent.name} ({agent.role})
                                     </div>
                                   </div>
                                 )}
                                 <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                                   <p className="font-medium mb-1">What happens next:</p>
                                   <ul className="list-disc ml-4 space-y-1 text-xs">
                                     <li>Proposal created and sent to governance</li>
                                     <li>Quad members review and vote</li>
                                     <li>On approval, DID activates automatically on-chain</li>
                                   </ul>
                                 </div>
                               </div>
                               <DialogFooter>
                                 <Button 
                                   variant="outline"
                                   onClick={() => setRequestDialogOpen(false)}
                                 >
                                   Cancel
                                 </Button>
                                 <Button
                                   onClick={() => requestActivationMutation.mutate({
                                     wallet_id: wallet.id,
                                     agent_id: agent?.id
                                   })}
                                   disabled={requestActivationMutation.isPending}
                                 >
                                   {requestActivationMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
                                 </Button>
                               </DialogFooter>
                             </DialogContent>
                           </Dialog>

                           <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => { setWalletToDelete(wallet); setDeleteDialogOpen(true); }}
                           >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete DID
                           </Button>
                           </div>
                           </div>

                           {/* Metadata */}
                          <div className="text-xs text-gray-500 border-t pt-2">
                          Created: {new Date(wallet.created_date).toLocaleDateString()}
                          </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Revoked DIDs Tab */}
          <TabsContent value="revoked" className="mt-6">
                  {revokedWallets.length === 0 ? (
                    <Card className="bg-gray-50">
                      <CardContent className="py-12 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">No revoked DIDs</p>
                        <p className="text-sm text-gray-500 mt-2">All your DIDs are active</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex gap-3">
                          <Info className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">About Revoked DIDs</p>
                            <p>Revoked DIDs have been deleted from the XRPL. You can reverse a revocation to recreate the DID on-chain.</p>
                          </div>
                        </div>
                      </div>

                      {revokedWallets.map(wallet => {
                        const agent = agents.find(a => a.wallet_id === wallet.id);
                        const didAddress = `did:xrpl:${wallet.classic_address}`;
                        const revocationInfo = getRevocationInfo(wallet);

                        return (
                          <Card key={wallet.id} className="border-red-200 bg-red-50/50">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Fingerprint className="w-5 h-5 text-red-600" />
                                    {wallet.name || 'Unnamed DID'}
                                  </CardTitle>
                                  <CardDescription className="mt-1">
                                    {didAddress}
                                  </CardDescription>
                                </div>
                                <Badge variant="destructive">Revoked</Badge>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                    {/* Revocation Details */}
                    <div className="bg-white rounded-lg p-4 space-y-3 border border-red-200">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Revoked At</div>
                          <div className="text-sm text-gray-600">{revocationInfo?.timestamp}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Reason</div>
                          <div className="text-sm text-gray-600">{revocationInfo?.reason}</div>
                        </div>
                        </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Network</div>
                        <Badge variant="outline">{wallet.network}</Badge>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Balance</div>
                        <div className="text-sm font-mono">{wallet.balance?.toFixed(2) || '0.00'} XRP</div>
                        </div>
                        </div>

                        {/* XRPL Address */}
                        <div>
                      <div className="text-xs text-gray-600 mb-1">XRPL Address</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white px-2 py-1 rounded border border-red-200 flex-1">
                          {wallet.classic_address}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(wallet.classic_address, 'Address')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        </div>
                        </div>

                        {/* Linked Agent */}
                        {agent && (
                      <div className="bg-white border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-red-600" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                              <div className="text-xs text-gray-600">{agent.role}</div>
                            </div>
                          </div>
                          <Badge variant="outline">Linked</Badge>
                          </div>
                          </div>
                          )}


                        </CardContent>
                        </Card>
                        );
                        })}
                        </div>
                        )}
                        </TabsContent>
                        </Tabs>



        {/* Delete DID Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Delete DID
              </DialogTitle>
              <DialogDescription>
                This will permanently remove this DID record from SoulBridge. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {walletToDelete && (
              <div className="space-y-3 py-2">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-sm font-medium text-gray-700">{walletToDelete.name || 'Unnamed DID'}</div>
                  <div className="text-xs text-gray-500 mt-1">did:xrpl:{walletToDelete.classic_address}</div>
                </div>
                <p className="text-sm text-gray-600">Are you sure you want to delete this DID?</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(walletToDelete?.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete DID'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Publish DID Dialog */}
        <PublishDIDDialog
          wallet={selectedWalletForPublish}
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          onSuccess={() => {
            setPublishDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            if (selectedWalletForPublish?.id) {
              handlePostPublishVerify(selectedWalletForPublish.id);
            }
          }}
        />

        {/* Verification Results Dialog */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                DID Verification Results
              </DialogTitle>
              <DialogDescription>
                Real-time status from XRPL network
              </DialogDescription>
            </DialogHeader>
            {currentVerification && currentVerification.verification ? (
              <div className="space-y-4">
                {/* Status Summary */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">DID:</span>
                    <code className="text-xs bg-white px-2 py-1 rounded">
                      {currentVerification.did}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Network:</span>
                    <Badge variant="outline">{currentVerification.network}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account Exists:</span>
                    {currentVerification.verification.account_exists ? (
                      <Badge className="bg-green-600">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">No</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">DID Published:</span>
                    {currentVerification.verification.did_active ? (
                      <Badge className="bg-green-600">✅ Published on XRPL</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">⚠️ Not Published</Badge>
                    )}
                  </div>
                  {currentVerification.verification.balance && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Balance:</span>
                      <span className="text-sm font-mono">{currentVerification.verification.balance} XRP</span>
                    </div>
                  )}
                  </div>

                  {/* On-Chain Proof */}
                  {currentVerification.verification.on_chain_proof && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
                    <div className="text-sm font-medium text-blue-900 mb-3">On-Chain Proof</div>
                    <div className="text-xs space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="text-gray-600">Account:</span>
                        <code className="bg-white px-2 py-1 rounded border border-blue-200 text-xs font-mono max-w-xs overflow-hidden text-ellipsis">
                          {currentVerification.verification.on_chain_proof.account}
                        </code>
                      </div>
                      {currentVerification.verification.on_chain_proof.previous_txn && (
                        <div className="flex items-start justify-between">
                          <span className="text-gray-600">Previous Txn:</span>
                          <code className="bg-white px-2 py-1 rounded border border-blue-200 text-xs font-mono max-w-xs overflow-hidden text-ellipsis">
                            {currentVerification.verification.on_chain_proof.previous_txn}
                          </code>
                        </div>
                      )}
                      {currentVerification.verification.on_chain_proof.ledger_sequence && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Ledger Seq:</span>
                          <span className="text-xs font-mono">{currentVerification.verification.on_chain_proof.ledger_sequence}</span>
                        </div>
                      )}
                      <a
                        href={`https://xrpscan.com/account/${currentVerification.verification.on_chain_proof.account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-2 inline-flex items-center gap-1"
                      >
                        View on XRPScan <ExternalLink className="w-3 h-3" />
                      </a>
                      </div>
                      </div>
                      )}

                      {currentVerification.verification.account && !currentVerification.verification.account_exists && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 space-y-2">
                      <div className="text-sm font-medium text-yellow-900 mb-2">Account Not Found on Chain</div>
                      <p className="text-xs text-yellow-800 mb-3">This address hasn't been activated on XRPL mainnet yet. It needs at least 20 XRP deposited to exist on the ledger.</p>
                      <a
                      href={`https://xrpscan.com/account/${currentVerification.verification.account}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-700 hover:text-yellow-900 text-xs font-medium inline-flex items-center gap-1 underline"
                      >
                      Check address on XRPScan <ExternalLink className="w-3 h-3" />
                      </a>
                      </div>
                      )}

                      <div className="text-xs text-gray-500 text-center">
                      Verified at: {new Date(currentVerification.verification.verified_at).toLocaleString()}
                      </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-4">Loading verification results...</p>
                {currentVerification && (
                  <pre className="text-xs bg-gray-100 p-2 rounded text-left overflow-auto max-h-40">
                    {JSON.stringify(currentVerification, null, 2)}
                  </pre>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setVerifyDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
        </div>
        );
        }
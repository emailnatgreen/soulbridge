import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Copy, CheckCircle, ExternalLink, User, Fingerprint, FileJson, AlertTriangle, Shield, Clock, Info, UserPlus, Edit3, History, Search, Activity, Link2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import AgentManagementDialog from '../components/AgentManagementDialog';
import AuditLogViewer from '../components/AuditLogViewer';
import DidResolverTool from '../components/DidResolverTool';
import DidDocumentEditor from '../components/DidDocumentEditor';
import WalletQRCode from '../components/WalletQRCode';
import DidReputationScore from '../components/DidReputationScore';
import PublishDIDDialog from '../components/PublishDIDDialog';
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

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const result = await base44.entities.Wallet.filter({ owner_id: user?.id });
      console.log('Fetched wallets:', result);
      console.log('Current user ID:', user?.id);
      return result;
    },
    enabled: !!user?.id
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  // NOTE: Revoke/Reverse functions don't exist - DIDs are managed via governance proposals

  const linkMutation = useMutation({
    mutationFn: ({ agent_id, wallet_id }) => 
      base44.functions.invoke('linkAgentToDID', { agent_id, wallet_id }),
    onSuccess: () => {
      toast.success('Agent successfully linked to DID');
      queryClient.invalidateQueries(['agents']);
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
      setVerificationResults(prev => ({
        ...prev,
        [walletId]: response.data
      }));
      setCurrentVerification(response.data);
      setVerifyDialogOpen(true);
      
      const v = response.data?.verification;
      if (!v?.account_exists) {
        toast.error('Account not found on XRPL');
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

  const getVerificationBadge = (walletId) => {
    const result = verificationResults[walletId];
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
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">DID Manager</h1>
              <p className="text-gray-600">Decentralized Identifiers on XRPL</p>
              <Badge className="mt-2 bg-purple-600">World's First XRPL DID Manager</Badge>
            </div>
            <div className="flex items-center gap-4">
              <DidResolverTool 
                trigger={
                  <Button variant="outline">
                    <Search className="w-4 h-4 mr-2" />
                    Resolve DID
                  </Button>
                }
              />
              <AgentManagementDialog 
                mode="create"
                trigger={
                  <Button variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Agent
                  </Button>
                }
                onSuccess={() => queryClient.invalidateQueries(['agents'])}
              />
              <Link to={createPageUrl('DIDHealthDashboard')}>
                <Button variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  Health Dashboard
                </Button>
              </Link>
              <Link to={createPageUrl('CreateDID')}>
                <Button>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Create New DID
                </Button>
              </Link>
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-600">{wallets.length}</div>
                <div className="text-sm text-gray-600">Total DIDs</div>
              </div>
            </div>
          </div>
        </div>

        {/* DID Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Active DIDs ({activeWallets.length})
            </TabsTrigger>
            <TabsTrigger value="revoked" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Revoked DIDs ({revokedWallets.length})
            </TabsTrigger>
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
                          {getVerificationBadge(wallet.id) && (
                          <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Last Verification:</span>
                          {getVerificationBadge(wallet.id)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(verificationResults[wallet.id]?.verification?.verified_at).toLocaleString()}
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

                        <Button
                          size="sm"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => { setSelectedWalletForPublish(wallet); setPublishDialogOpen(true); }}
                        >
                          <Upload className="w-3 h-3 mr-2" />
                          Publish DID On-Chain
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
            {currentVerification && (
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

                {/* DID On-Chain Data */}
                {currentVerification.did_data ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                      <CheckCircle className="w-4 h-4" />
                      DID Object Found On-Chain
                    </div>
                    {currentVerification.did_data.uri && (
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-medium">URI:</div>
                        <div className="text-xs bg-white p-2 rounded border border-green-200 break-all">
                          {currentVerification.did_data.uri}
                        </div>
                      </div>
                    )}
                    {currentVerification.did_data.document && (
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-medium">DID Document:</div>
                        <pre className="text-xs bg-white p-2 rounded border border-green-200 overflow-x-auto max-h-48">
                          {currentVerification.did_data.document}
                        </pre>
                      </div>
                    )}
                    {currentVerification.did_data.data && (
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-medium">Data:</div>
                        <div className="text-xs bg-white p-2 rounded border border-green-200 break-all">
                          {currentVerification.did_data.data}
                        </div>
                      </div>
                    )}
                    {!currentVerification.did_data.uri && !currentVerification.did_data.document && !currentVerification.did_data.data && (
                      <div className="text-xs text-green-700">DID object exists on-chain (empty fields — object anchor confirmed).</div>
                    )}
                  </div>
                ) : currentVerification.verification.account_exists && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      No DID Object Published
                    </div>
                    <p className="text-xs text-yellow-700">This XRPL account exists but has no DID document published on-chain. Use the DID Editor to publish it.</p>
                  </div>
                )}

                {/* Message */}
                {currentVerification.verification.message && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      {currentVerification.verification.message}
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500 text-center">
                  Verified at: {new Date(currentVerification.verification.verified_at).toLocaleString()}
                </div>
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
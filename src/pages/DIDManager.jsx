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
import { Copy, CheckCircle, ExternalLink, User, Fingerprint, FileJson, AlertTriangle, Shield, Clock, Info, UserPlus, Edit3, History, Search, Activity, Link2, Sparkles, Home, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AgentManagementDialog from '../components/AgentManagementDialog';
import AuditLogViewer from '../components/AuditLogViewer';
import DidResolverTool from '../components/DidResolverTool';
import DidDocumentEditor from '../components/DidDocumentEditor';
import WalletQRCode from '../components/WalletQRCode';
import DidReputationScore from '../components/DidReputationScore';
import PublishDIDDialog from '../components/PublishDIDDialog';
import DidReviewPanel from '../components/DidReviewPanel';
import DidVerificationPanel from '../components/DidVerificationPanel';
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

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets', user?.id, user?.role],
    queryFn: async () => {
      const list = user?.role === 'admin'
        ? await base44.entities.Wallet.list('-created_date', 100)
        : await base44.entities.Wallet.filter({ owner_id: user?.id });
      // Sync live balances sequentially to avoid batch overload
      const result = [];
      for (const w of list) {
        try {
          const res = await base44.functions.invoke('getBalance', { wallet_id: w.id });
          if (res.data?.balance !== undefined) {
            result.push({ ...w, balance: res.data.balance });
          } else {
            result.push(w);
          }
        } catch (e) {
          result.push(w);
        }
      }
      return result;
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getAgentForWallet = (walletId) => {
    return agents.find(agent => agent.wallet_id === walletId);
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
    mutationFn: async (walletId) => {
      const wallet = wallets.find(w => w.id === walletId);
      const result = await base44.functions.invoke('verifyDIDStatus', { wallet_id: walletId });
      return { ...result.data, wallet };
    },
    onSuccess: (data) => {
      if (data?.error || data?.message?.includes('error')) {
        toast.error(data?.message || 'XRPL network issue—try again in a moment');
        setVerifyingWalletId(null);
        setVerifyDialogOpen(false);
        return;
      }
      setVerificationResults(prev => ({
        ...prev,
        [verifyingWalletId]: data
      }));
      setCurrentVerification(data);
      setVerifyDialogOpen(true);
      
      const v = data?.verification;
      if (v?.did_active) {
        toast.success('✅ DID is published on XRPL');
      } else if (v?.account_exists) {
        toast.warning('⚠️ Account exists but DID is not published on-chain');
      } else if (!v?.account_exists) {
        const network = data?.network || data?.wallet?.network || 'mainnet';
        const fundingMsg = network === 'mainnet'
          ? 'Fund this address with at least 20 XRP to activate it.'
          : 'Fund this address with testnet XRP (via faucet) to activate it.';
        toast.error(`Account not found on XRPL ${network}. ${fundingMsg}`);
      }
    },
    onError: (error) => {
      toast.error('🌐 Network issue reaching XRPL—check your connection and try again');
      console.error('Verification error:', error);
      setVerifyingWalletId(null);
      setVerifyDialogOpen(false);
    }
  });

  const handleVerifyDID = (walletId) => {
    setVerifyingWalletId(walletId);
    verifyMutation.mutate(walletId);
  };

  const handlePostPublishVerify = (walletId) => {
    setTimeout(() => {
      verifyMutation.mutate(walletId);
    }, 4000);
  };

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

  const getVerificationBadge = (wallet) => {
    if (wallet.is_published) {
      return <Badge className="bg-green-600">✅ Published on XRPL</Badge>;
    }

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

        <DidReviewPanel 
          wallets={wallets}
          agents={agents}
          activeWallets={activeWallets}
          revokedWallets={revokedWallets}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
          <TabsList className="bg-slate-100 border border-slate-200 p-1 rounded-xl flex gap-1 h-auto w-fit">
            {[
              { value: 'active', label: 'Active DIDs', icon: CheckCircle, count: activeWallets.length, gradient: 'from-indigo-600 to-purple-600' },
              { value: 'revoked', label: 'Revoked DIDs', icon: AlertTriangle, count: revokedWallets.length, gradient: 'from-red-500 to-orange-500' },
            ].map(({ value, label, icon: Icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">
                  {count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeWallets.length === 0 ? (
              <Card className="bg-gray-50">
                <CardContent className="py-12 text-center">
                  <Fingerprint className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active DIDs found</p>
                  <Link to={createPageUrl('CreateDID')} className="mt-4 inline-block">
                    <Button>Create New DID</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {activeWallets.map((wallet) => (
                  <WalletCard 
                    key={wallet.id} 
                    wallet={wallet}
                    agent={getAgentForWallet(wallet.id)}
                    onVerify={handleVerifyDID}
                    onPublish={() => setSelectedWalletForPublish(wallet)}
                    onDelete={() => { setWalletToDelete(wallet); setDeleteDialogOpen(true); }}
                    verifyLoading={verifyMutation.isPending}
                    copyToClipboard={copyToClipboard}
                    agents={agents}
                    selectedAgent={selectedAgent}
                    setSelectedAgent={setSelectedAgent}
                    linkDialogOpen={linkDialogOpen}
                    setLinkDialogOpen={setLinkDialogOpen}
                    handleLinkAgent={handleLinkAgent}
                    linkMutation={linkMutation}
                    user={user}
                    getDIDDocument={getDIDDocument}
                    getVerificationBadge={getVerificationBadge}
                    verificationResults={verificationResults}
                    requestDialogOpen={requestDialogOpen}
                    setRequestDialogOpen={setRequestDialogOpen}
                    selectedWalletForRequest={selectedWalletForRequest}
                    setSelectedWalletForRequest={setSelectedWalletForRequest}
                    requestActivationMutation={requestActivationMutation}
                    publishDialogOpen={publishDialogOpen}
                    setPublishDialogOpen={setPublishDialogOpen}
                    selectedWalletForPublish={selectedWalletForPublish}
                    setSelectedWalletForPublish={setSelectedWalletForPublish}
                    queryClient={queryClient}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="revoked" className="mt-6">
            {revokedWallets.length === 0 ? (
              <Card className="bg-gray-50">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No revoked DIDs</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {revokedWallets.map(wallet => (
                  <RevokedWalletCard 
                    key={wallet.id}
                    wallet={wallet}
                    agent={agents.find(a => a.wallet_id === wallet.id)}
                    revocationInfo={getRevocationInfo(wallet)}
                    copyToClipboard={copyToClipboard}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Delete DID
              </DialogTitle>
            </DialogHeader>
            {walletToDelete && (
              <div className="space-y-3 py-2">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-sm font-medium text-gray-700">{walletToDelete.name || 'Unnamed DID'}</div>
                </div>
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

        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                DID Verification Results
              </DialogTitle>
            </DialogHeader>
            {currentVerification ? (
              <DidVerificationPanel verification={currentVerification} wallet={wallets.find(w => w.id === verifyingWalletId)} />
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-600">Loading verification results...</p>
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

// Extracted card component for cleaner rendering
function WalletCard(props) {
  const {
    wallet, agent, onVerify, onPublish, onDelete, verifyLoading,
    copyToClipboard, getDIDDocument, getVerificationBadge, verificationResults,
    queryClient, user
  } = props;

  const handlePublish = async () => {
    try {
      const res = await base44.functions.invoke('getBalance', { wallet_id: wallet.id });
      if (res.data?.balance !== undefined) {
        queryClient.setQueryData(['wallets', user?.id, user?.role], prev => 
          prev?.map(w => w.id === wallet.id ? { ...w, balance: res.data.balance } : w)
        );
      }
    } catch (e) {
      console.log('Balance sync skipped');
    }
    onPublish();
  };

  const didAddress = `did:xrpl:${wallet.classic_address}`;
  const didDoc = getDIDDocument(wallet);

  return (
    <Card className="hover:shadow-lg transition-shadow border-green-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-indigo-600" />
              {agent ? `${agent.name}'s DID` : (wallet.name || 'Unnamed Wallet')}
            </CardTitle>
            <Badge variant="outline" className="mt-2">
              {wallet.network}
            </Badge>
          </div>
          <Badge className="bg-green-600">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">DID Address</div>
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
            <code className="text-xs flex-1 overflow-hidden text-ellipsis">{didAddress}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(didAddress, 'DID Address')}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">XRPL Address</div>
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
            <code className="text-xs flex-1 overflow-hidden text-ellipsis">{wallet.classic_address}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(wallet.classic_address, 'Address')}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {agent && (
          <div className="border-t pt-4">
            <DidReputationScore agentId={agent.id} compact={false} />
          </div>
        )}

        <div className="border-t pt-4">
          <WalletQRCode wallet={wallet} currentUser={user} />
        </div>

        {getVerificationBadge(wallet) && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Last Verification:</span>
              {getVerificationBadge(wallet)}
            </div>
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <Button size="sm" variant="outline" className="w-full" onClick={() => onVerify(wallet.id)} disabled={verifyLoading}>
            <Shield className="w-3 h-3 mr-2" />
            {verifyLoading ? 'Verifying...' : 'Verify on XRPL'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <AuditLogViewer wallet={wallet} trigger={<Button size="sm" variant="outline" className="w-full"><History className="w-3 h-3 mr-2" />Audit Log</Button>} />
            <DidDocumentEditor wallet={wallet} didDocument={didDoc} trigger={<Button size="sm" variant="outline" className="w-full"><FileJson className="w-3 h-3 mr-2" />View Doc</Button>} />
          </div>

          <Button size="sm" variant="outline" className="w-full bg-indigo-50 border-indigo-200 text-indigo-700" onClick={handlePublish}>
            📤 Publish to Mainnet
          </Button>

          <Button size="sm" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="w-3 h-3 mr-2" />
            Delete DID
          </Button>
        </div>

        <div className="text-xs text-gray-500 border-t pt-2">
          Created: {new Date(wallet.created_date).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

function RevokedWalletCard({ wallet, agent, revocationInfo, copyToClipboard }) {
  const didAddress = `did:xrpl:${wallet.classic_address}`;

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-red-600" />
              {wallet.name || 'Unnamed DID'}
            </CardTitle>
            <CardDescription className="mt-1">{didAddress}</CardDescription>
          </div>
          <Badge variant="destructive">Revoked</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 space-y-3 border border-red-200">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-700">Revoked At</div>
              <div className="text-sm text-gray-600">{revocationInfo?.timestamp}</div>
            </div>
          </div>
        </div>

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

        <div>
          <div className="text-xs text-gray-600 mb-1">XRPL Address</div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-white px-2 py-1 rounded border border-red-200 flex-1">{wallet.classic_address}</code>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(wallet.classic_address, 'Address')}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {agent && (
          <div className="bg-white border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-red-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                <div className="text-xs text-gray-600">{agent.role}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
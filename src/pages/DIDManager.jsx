import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Copy, CheckCircle, ExternalLink, User, Fingerprint, Trash2, Link2, Unlink, FileJson, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
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
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [walletToRevoke, setWalletToRevoke] = useState(null);
  const [verificationResults, setVerificationResults] = useState({});
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [currentVerification, setCurrentVerification] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const revokeMutation = useMutation({
    mutationFn: (walletId) => base44.functions.invoke('revokeDID', { wallet_id: walletId }),
    onSuccess: () => {
      toast.success('DID successfully revoked on XRPL');
      queryClient.invalidateQueries(['wallets']);
      setRevokeDialogOpen(false);
      setWalletToRevoke(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to revoke DID');
    }
  });

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

  const unlinkMutation = useMutation({
    mutationFn: (agentId) => 
      base44.functions.invoke('linkAgentToDID', { agent_id: agentId, wallet_id: null }),
    onSuccess: () => {
      toast.success('Agent unlinked from DID');
      queryClient.invalidateQueries(['agents']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to unlink agent');
    }
  });

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

  const handleRevoke = (wallet) => {
    setWalletToRevoke(wallet);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = () => {
    if (walletToRevoke) {
      revokeMutation.mutate(walletToRevoke.id);
    }
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
      toast.success('DID verification complete');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to verify DID');
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
      return <Badge variant="outline" className="text-red-600">Not on Chain</Badge>;
    }
    if (!verification.did_active) {
      return <Badge variant="outline" className="text-yellow-600">No DID Data</Badge>;
    }
    return <Badge className="bg-green-600">Verified Active</Badge>;
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

        {/* DIDs Grid */}
        {wallets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Fingerprint className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No DIDs Yet</h3>
              <p className="text-gray-600 mb-4">Create a wallet to generate your first DID on XRPL</p>
              <Link to={createPageUrl('Wallets')}>
                <Button>Create Wallet</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {wallets.map((wallet) => {
              const agent = getAgentForWallet(wallet.id);
              const didAddress = `did:xrpl:${wallet.classic_address}`;
              const revoked = isRevoked(wallet);
              const didDoc = getDIDDocument(wallet);
              
              return (
                <Card key={wallet.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Fingerprint className="w-5 h-5 text-indigo-600" />
                          {wallet.name || 'Unnamed Wallet'}
                        </CardTitle>
                        <Badge variant="outline" className="mt-2">
                          {wallet.network}
                        </Badge>
                      </div>
                      {revoked ? (
                        <Badge className="bg-red-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Revoked
                        </Badge>
                      ) : (
                        <Badge className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
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

                    {/* Agent Profile */}
                    {agent ? (
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Associated Agent
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => unlinkMutation.mutate(agent.id)}
                            disabled={unlinkMutation.isPending}
                          >
                            <Unlink className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-md">
                          <div className="font-medium text-indigo-900">{agent.name}</div>
                          <div className="text-sm text-indigo-700 mt-1">{agent.role}</div>
                          <div className="text-xs text-indigo-600 mt-2 line-clamp-2">
                            {agent.purpose}
                          </div>
                          <Link to={createPageUrl('AgentDetails') + `?id=${agent.id}`}>
                            <Button size="sm" variant="outline" className="mt-3 w-full">
                              View Agent <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-4">
                        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full">
                              <Link2 className="w-3 h-3 mr-2" />
                              Link Agent to DID
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Link Agent to DID</DialogTitle>
                              <DialogDescription>
                                Select an agent to link to this DID
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an agent" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getUnlinkedAgents().map((a) => (
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
                      </div>
                    )}

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
                      
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1">
                              <FileJson className="w-3 h-3 mr-2" />
                              View DID Doc
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>DID Document</DialogTitle>
                              <DialogDescription>
                                Complete DID Document for {didAddress}
                              </DialogDescription>
                            </DialogHeader>
                            <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-x-auto">
                              {JSON.stringify(didDoc, null, 2)}
                            </pre>
                            <DialogFooter>
                              <Button
                                onClick={() => copyToClipboard(JSON.stringify(didDoc, null, 2), 'DID Document')}
                              >
                                Copy Document
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        {!revoked && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevoke(wallet)}
                            disabled={revokeMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Revoke
                          </Button>
                        )}
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

        {/* Revoke Confirmation Dialog */}
        <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Revoke DID
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke this DID? This action will submit a DIDDelete transaction to the XRPL and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {walletToRevoke && (
              <div className="py-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">DID:</span>
                  <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                    did:xrpl:{walletToRevoke.classic_address}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Wallet:</span> {walletToRevoke.name || 'Unnamed'}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRevoke}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke DID'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    <span className="text-sm font-medium">DID Active:</span>
                    {currentVerification.verification.did_active ? (
                      <Badge className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">Not Set</Badge>
                    )}
                  </div>
                  {currentVerification.verification.balance && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Balance:</span>
                      <span className="text-sm font-mono">{currentVerification.verification.balance} XRP</span>
                    </div>
                  )}
                </div>

                {/* DID Data */}
                {currentVerification.did_data && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">On-Chain DID Data:</div>
                    <div className="bg-gray-50 p-3 rounded-md space-y-2">
                      {currentVerification.did_data.document && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Document:</div>
                          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(currentVerification.did_data.document, null, 2)}
                          </pre>
                        </div>
                      )}
                      {currentVerification.did_data.uri && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">URI:</div>
                          <div className="text-xs bg-white p-2 rounded">
                            {currentVerification.did_data.uri}
                          </div>
                        </div>
                      )}
                      {currentVerification.did_data.data && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Data:</div>
                          <div className="text-xs bg-white p-2 rounded">
                            {currentVerification.did_data.data}
                          </div>
                        </div>
                      )}
                    </div>
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
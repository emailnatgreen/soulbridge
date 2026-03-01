import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Award,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  Trash2,
  Plus,
  Search,
  AlertTriangle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import CredentialTemplates from '../components/CredentialTemplates';
import CredentialQRCode from '../components/CredentialQRCode';
import BatchCredentialIssue from '../components/BatchCredentialIssue';

export default function DidCredentials() {
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['user-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date'),
    enabled: !!user
  });

  const userDID = wallets[0] ? `did:xrpl:${wallets[0].classic_address}` : null;
  const userAddress = wallets[0]?.classic_address;

  // Fetch ALL credentials and filter client-side to handle all DID formats
  const { data: allCredentials = [], isLoading: credsLoading } = useQuery({
    queryKey: ['all-credentials'],
    queryFn: () => base44.entities.DidCredential.list('-created_date', 500),
    refetchInterval: 30000,
  });

  // Match credentials by DID format, classic address, or wallet ID
  const isMyDID = (did) => {
    if (!did) return false;
    if (userDID && did === userDID) return true;
    if (userAddress && (did.includes(userAddress) || did === userAddress)) return true;
    if (wallets[0] && did === wallets[0].id) return true;
    if (user && (did === user.email || did === user.id)) return true;
    return false;
  };

  const issuedCredentials = allCredentials.filter(c => isMyDID(c.issuer_did) || isMyDID(c.issuer_wallet_id));
  const receivedCredentials = allCredentials.filter(c => isMyDID(c.subject_did) || isMyDID(c.subject_wallet_id));

  const { data: allWallets = [] } = useQuery({
    queryKey: ['all-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 200)
  });

  const [issueForm, setIssueForm] = useState({
    subject_did: '',
    credential_type: 'identity_verified',
    credential_name: '',
    credential_description: '',
    expiration_date: '',
    visibility: 'private'
  });

  const issueCredentialMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('issueDidCredential', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issued-credentials'] });
      toast.success('Credential issued successfully');
      setIssueDialogOpen(false);
      setIssueForm({
        subject_did: '',
        credential_type: 'identity_verified',
        credential_name: '',
        credential_description: '',
        expiration_date: '',
        visibility: 'private'
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to issue credential');
    }
  });

  const verifyCredentialMutation = useMutation({
    mutationFn: async (credential_id) => {
      const response = await base44.functions.invoke('verifyDidCredential', { credential_id });
      return response.data;
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      toast.success(data.verified ? 'Credential verified!' : 'Verification failed');
    },
    onError: (error) => {
      toast.error('Failed to verify credential');
    }
  });

  const revokeCredentialMutation = useMutation({
    mutationFn: async ({ credential_id, revocation_reason }) => {
      const response = await base44.functions.invoke('revokeDidCredential', {
        credential_id,
        revocation_reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issued-credentials'] });
      toast.success('Credential revoked');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to revoke credential');
    }
  });

  const handleIssueCredential = () => {
    const credential_data = {
      description: issueForm.credential_description
    };

    issueCredentialMutation.mutate({
      subject_did: issueForm.subject_did,
      credential_type: issueForm.credential_type,
      credential_name: issueForm.credential_name,
      credential_data,
      expiration_date: issueForm.expiration_date || null,
      visibility: issueForm.visibility
    });
  };

  const handleVerifyCredential = (credential) => {
    setSelectedCredential(credential);
    verifyCredentialMutation.mutate(credential.id);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      revoked: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    const icons = {
      identity_verified: Shield,
      skill_certification: Award,
      professional_license: CheckCircle,
      educational_degree: Award,
      membership: CheckCircle,
      authorization: Shield,
      achievement: Award,
      compliance_attestation: CheckCircle,
      custom: Award
    };
    const Icon = icons[type] || Award;
    return <Icon className="w-4 h-4" />;
  };

  const filteredIssued = issuedCredentials.filter(cred =>
    cred.credential_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.subject_did.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceived = receivedCredentials.filter(cred =>
    cred.credential_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.issuer_did.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Award className="w-10 h-10 text-indigo-600" />
                DID Credentials
              </h1>
              <p className="text-gray-600">Issue and manage verifiable credentials</p>
              <Badge className="mt-2 bg-purple-600">W3C Compliant</Badge>
            </div>
            <div className="flex gap-2">
              <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-white">
                    <Send className="w-4 h-4 mr-2" />
                    Batch Issue
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Batch Credential Issuance</DialogTitle>
                    <DialogDescription>
                      Issue the same credential to multiple DIDs at once
                    </DialogDescription>
                  </DialogHeader>
                  <BatchCredentialIssue 
                    issuerDID={userDID} 
                    onComplete={() => setBatchDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Issue Credential
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Issue New Credential</DialogTitle>
                  <DialogDescription>
                    Choose a template or create a custom credential
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {!selectedTemplate ? (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Choose a Template</h3>
                        <CredentialTemplates 
                          onSelectTemplate={(template) => {
                            setSelectedTemplate(template);
                            setIssueForm({
                              ...issueForm,
                              credential_type: template.type,
                              credential_name: template.name
                            });
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedTemplate({ type: 'custom', name: 'Custom' })}
                        >
                          Or Create Custom Credential
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                        <span className="font-medium text-indigo-900">
                          Template: {selectedTemplate.name}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setSelectedTemplate(null)}
                        >
                          Change
                        </Button>
                      </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Recipient DID</label>
                    <Input
                      placeholder="did:xrpl:..."
                      value={issueForm.subject_did}
                      onChange={(e) => setIssueForm({ ...issueForm, subject_did: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Credential Type</label>
                    <Select
                      value={issueForm.credential_type}
                      onValueChange={(value) => setIssueForm({ ...issueForm, credential_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="identity_verified">Identity Verified</SelectItem>
                        <SelectItem value="skill_certification">Skill Certification</SelectItem>
                        <SelectItem value="professional_license">Professional License</SelectItem>
                        <SelectItem value="educational_degree">Educational Degree</SelectItem>
                        <SelectItem value="membership">Membership</SelectItem>
                        <SelectItem value="authorization">Authorization</SelectItem>
                        <SelectItem value="achievement">Achievement</SelectItem>
                        <SelectItem value="compliance_attestation">Compliance Attestation</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Credential Name</label>
                    <Input
                      placeholder="e.g., Senior Developer Certification"
                      value={issueForm.credential_name}
                      onChange={(e) => setIssueForm({ ...issueForm, credential_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      placeholder="Describe what this credential certifies..."
                      value={issueForm.credential_description}
                      onChange={(e) => setIssueForm({ ...issueForm, credential_description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Expiration Date (Optional)</label>
                      <Input
                        type="date"
                        value={issueForm.expiration_date}
                        onChange={(e) => setIssueForm({ ...issueForm, expiration_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Visibility</label>
                      <Select
                        value={issueForm.visibility}
                        onValueChange={(value) => setIssueForm({ ...issueForm, visibility: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="shared">Shared</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                      <Button
                        onClick={handleIssueCredential}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={issueCredentialMutation.isPending}
                      >
                        {issueCredentialMutation.isPending ? 'Issuing...' : 'Issue Credential'}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{issuedCredentials.length}</div>
                <div className="text-sm text-gray-600 mt-1">Issued</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{receivedCredentials.length}</div>
                <div className="text-sm text-gray-600 mt-1">Received</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {receivedCredentials.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {receivedCredentials.filter(c => c.status === 'revoked').length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Revoked</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search credentials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="received" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">Received Credentials ({receivedCredentials.length})</TabsTrigger>
            <TabsTrigger value="issued">Issued by Me ({issuedCredentials.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received">
            <Card>
              <CardHeader>
                <CardTitle>Credentials I've Received</CardTitle>
                <CardDescription>Verifiable credentials issued to your DID</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredReceived.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Award className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No credentials received yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReceived.map((cred) => (
                      <div key={cred.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                              {getTypeIcon(cred.credential_type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{cred.credential_name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {cred.credential_data?.description}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>From: {cred.issuer_did.substring(0, 25)}...</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(cred.issuance_date).toLocaleDateString()}
                                </span>
                                {cred.verification_count > 0 && (
                                  <span>✓ Verified {cred.verification_count}x</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(cred.status)}>
                              {cred.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCredential(cred);
                                setShowQRCode(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issued">
            <Card>
              <CardHeader>
                <CardTitle>Credentials I've Issued</CardTitle>
                <CardDescription>Verifiable credentials you've issued to other DIDs</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredIssued.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Send className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>You haven't issued any credentials yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredIssued.map((cred) => (
                      <div key={cred.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                              {getTypeIcon(cred.credential_type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{cred.credential_name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {cred.credential_data?.description}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>To: {cred.subject_did.substring(0, 25)}...</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(cred.issuance_date).toLocaleDateString()}
                                </span>
                                {cred.verification_count > 0 && (
                                  <span>✓ Verified {cred.verification_count}x</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(cred.status)}>
                              {cred.status}
                            </Badge>
                            {cred.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to revoke this credential?')) {
                                    revokeCredentialMutation.mutate({
                                      credential_id: cred.id,
                                      revocation_reason: 'Revoked by issuer'
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Code Dialog */}
        {showQRCode && selectedCredential && (
          <Dialog open={showQRCode} onOpenChange={() => {
            setShowQRCode(false);
            setSelectedCredential(null);
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedCredential.credential_name}</DialogTitle>
                <DialogDescription>
                  Scan or share this QR code to verify the credential
                </DialogDescription>
              </DialogHeader>
              <CredentialQRCode credential={selectedCredential} />
            </DialogContent>
          </Dialog>
        )}

        {/* Verification Result Dialog */}
        {verificationResult && (
          <Dialog open={!!verificationResult} onOpenChange={() => setVerificationResult(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {verificationResult.verified ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  Verification Result
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${verificationResult.verified ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-sm font-medium">
                    {verificationResult.verified ? 'Credential is valid ✓' : 'Credential verification failed'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Verification Checks:</div>
                  {Object.entries(verificationResult.checks || {}).map(([check, passed]) => (
                    <div key={check} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{check.replace('_', ' ')}</span>
                      {passed ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>

                {verificationResult.issues && verificationResult.issues.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Issues Found:
                    </div>
                    {verificationResult.issues.map((issue, idx) => (
                      <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {issue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Fingerprint, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowRight,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'DID Details', icon: Fingerprint },
  { id: 2, label: 'Scan QR Code', icon: QrCode },
  { id: 3, label: 'Waiting for Signature', icon: Loader2 },
  { id: 4, label: 'Complete', icon: CheckCircle }
];

export default function CreateDID() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    walletId: '',
    name: '',
    profileUrl: typeof window !== 'undefined' ? window.location.origin : '',
    instruction: ''
  });
  const [qrData, setQrData] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [signatureStatus, setSignatureStatus] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user?.id }),
    enabled: !!user?.id
  });

  const createDIDMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('mcp', {
      tool: 'create_did',
      params: {
        address: data.address,
        name: data.name,
        profileUrl: data.profileUrl,
        instruction: data.instruction
      }
    }),
    onSuccess: (response) => {
      if (response.data.success) {
        setQrData(response.data.result);
        setCurrentStep(2);
        toast.success('QR code generated! Scan with Xaman to sign.');
        // Start polling for signature
        startPolling(response.data.result.uuid);
      } else {
        toast.error(response.data.error || 'Failed to generate QR code');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create DID request');
    }
  });

  const checkStatusMutation = useMutation({
    mutationFn: (uuid) => base44.functions.invoke('mcp', {
      tool: 'check_status',
      params: { uuid }
    })
  });

  const startPolling = (uuid) => {
    const interval = setInterval(async () => {
      try {
        const response = await checkStatusMutation.mutateAsync(uuid);
        const status = response.data.result;
        
        if (status.signed) {
          clearInterval(interval);
          setSignatureStatus({
            success: true,
            transaction: status.transaction,
            account: status.account
          });
          setCurrentStep(4);
          toast.success('DID successfully created on XRPL!');
        } else if (status.resolved && !status.signed) {
          clearInterval(interval);
          setSignatureStatus({
            success: false,
            message: 'Signature request was rejected or expired'
          });
          toast.error('DID creation was cancelled');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);

    // Auto-stop polling after 10 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        if (currentStep === 3) {
          toast.error('Request timed out. Please try again.');
        }
      }
    }, 600000);
  };

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedWallet = wallets.find(w => w.id === formData.walletId);
    if (!selectedWallet) {
      toast.error('Please select a wallet');
      return;
    }

    createDIDMutation.mutate({
      address: selectedWallet.classic_address,
      name: formData.name,
      profileUrl: formData.profileUrl,
      instruction: formData.instruction
    });
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setFormData({ walletId: '', name: '', profileUrl: '', instruction: '' });
    setQrData(null);
    setSignatureStatus(null);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('DIDManager')}>
            <Button variant="outline" className="mb-4">
              ← Back to DID Manager
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New DID</h1>
          <p className="text-gray-600">Create a Decentralized Identifier on XRPL using Xaman</p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Progress value={progressPercentage} className="h-2" />
              <div className="grid grid-cols-4 gap-2">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isComplete = currentStep > step.id;
                  
                  return (
                    <div key={step.id} className="text-center">
                      <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        isComplete ? 'bg-green-600 text-white' :
                        isActive ? 'bg-indigo-600 text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div className={`text-xs font-medium ${
                        isActive ? 'text-indigo-600' : 
                        isComplete ? 'text-green-600' : 
                        'text-gray-400'
                      }`}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 1 && !createDIDMutation.isPending && (
          <Card>
            <CardHeader>
              <CardTitle>DID Information</CardTitle>
              <CardDescription>
                Provide details for your new Decentralized Identifier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="wallet">Select Wallet *</Label>
                  <select
                    id="wallet"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.walletId}
                    onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                    required
                  >
                    <option value="">Choose a wallet...</option>
                    {wallets.map(wallet => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name || 'Unnamed'} - {wallet.classic_address?.slice(0, 10) || 'N/A'}... ({wallet.network})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., SoulBridge Citizen"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="profileUrl">Profile URL</Label>
                  <Input
                    id="profileUrl"
                    placeholder="https://soulbridge.base44.app"
                    value={formData.profileUrl}
                    onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="instruction">Custom Instruction</Label>
                  <Textarea
                    id="instruction"
                    placeholder="Forge your identity on XRPL"
                    value={formData.instruction}
                    onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createDIDMutation.isPending}>
                  {createDIDMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating QR Code...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {createDIDMutation.isPending && (
          <Card>
            <CardContent className="py-16 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-gray-600 font-medium">Generating QR Code...</p>
              <p className="text-sm text-gray-400">Contacting Xaman, please wait</p>
            </CardContent>
          </Card>
        )}

        {!createDIDMutation.isPending && currentStep === 2 && qrData && (
          <Card>
            <CardHeader>
              <CardTitle>Scan QR Code with Xaman</CardTitle>
              <CardDescription>
                Open the Xaman app and scan this QR code to sign the DID creation transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 flex justify-center">
                <img 
                  src={qrData.qr_png} 
                  alt="Xaman QR Code" 
                  className="w-64 h-64"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Instructions:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Open the Xaman wallet app on your mobile device</li>
                      <li>Tap the scan button</li>
                      <li>Point your camera at the QR code above</li>
                      <li>Review the transaction and approve</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Badge variant="outline" className="text-gray-600">
                  QR Code expires: {new Date(qrData.expires).toLocaleString()}
                </Badge>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(qrData.qr, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Xaman (Mobile)
              </Button>

              <Button variant="ghost" className="w-full" onClick={resetFlow}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                Waiting for Signature
              </CardTitle>
              <CardDescription>
                Please approve the transaction in your Xaman app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="mt-4 text-gray-600 text-center">
                  Monitoring XRPL for your signature...
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    Keep your Xaman app open and approve the transaction when prompted.
                    This may take up to 30 seconds after approval.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && signatureStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {signatureStatus.success ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    DID Successfully Created!
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    Creation Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {signatureStatus.success ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Your DID is now active on XRPL!
                    </h3>
                    <p className="text-sm text-green-700">
                      Transaction has been confirmed on the blockchain
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Transaction Hash:</div>
                      <code className="text-xs bg-white px-2 py-1 rounded block overflow-x-auto">
                        {signatureStatus.transaction}
                      </code>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">DID Address:</div>
                      <code className="text-xs bg-white px-2 py-1 rounded block overflow-x-auto">
                        did:xrpl:{signatureStatus.account}
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link to={createPageUrl('DIDManager')} className="flex-1">
                      <Button className="w-full">
                        View in DID Manager
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={resetFlow}>
                      Create Another
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                      DID Creation Failed
                    </h3>
                    <p className="text-sm text-red-700">
                      {signatureStatus.message || 'The transaction was not completed'}
                    </p>
                  </div>

                  <Button onClick={resetFlow} className="w-full">
                    Try Again
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Fingerprint,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function DidLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [didAddress, setDidAddress] = useState('');
  const [step, setStep] = useState('select'); // select, challenge, verify
  const [challenge, setChallenge] = useState(null);
  const [signature, setSignature] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['user-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date'),
    enabled: !!user
  });

  const { data: allWallets = [] } = useQuery({
    queryKey: ['all-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 200)
  });

  // Generate authentication challenge
  const generateChallengeMutation = useMutation({
    mutationFn: async (did) => {
      const challengeData = {
        did,
        timestamp: new Date().toISOString(),
        nonce: Math.random().toString(36).substring(7),
        action: 'authenticate'
      };
      
      // In production, this would call a backend function
      // For now, store challenge in state
      return challengeData;
    },
    onSuccess: (data) => {
      setChallenge(data);
      setStep('challenge');
      toast.success('Challenge generated - sign with your DID');
    }
  });

  // Verify signature
  const verifySignatureMutation = useMutation({
    mutationFn: async ({ did, challenge, signature }) => {
      // In production, call backend to verify signature
      // For demo purposes, we'll simulate verification
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if DID exists
      const wallet = allWallets.find(w => `did:xrpl:${w.classic_address}` === did);
      if (!wallet) {
        throw new Error('DID not found in registry');
      }

      // Simulate signature verification (in production, verify cryptographically)
      if (!signature || signature.length < 10) {
        throw new Error('Invalid signature format');
      }

      return {
        verified: true,
        did,
        wallet,
        session_token: 'session_' + Math.random().toString(36).substring(7)
      };
    },
    onSuccess: (data) => {
      // Store DID session
      localStorage.setItem('did_auth_session', JSON.stringify({
        did: data.did,
        wallet_id: data.wallet.id,
        authenticated_at: new Date().toISOString(),
        session_token: data.session_token
      }));

      toast.success('Authentication successful! 🎉');
      
      // Redirect to intended destination or home
      const from = location.state?.from?.pathname || createPageUrl('Home');
      setTimeout(() => navigate(from), 1000);
    },
    onError: (error) => {
      toast.error('Authentication failed: ' + error.message);
    }
  });

  const handleSelectDID = (did) => {
    setDidAddress(did);
    generateChallengeMutation.mutate(did);
  };

  const handleManualDID = () => {
    if (!didAddress.startsWith('did:xrpl:')) {
      toast.error('Please enter a valid DID (did:xrpl:...)');
      return;
    }
    generateChallengeMutation.mutate(didAddress);
  };

  const handleVerify = () => {
    if (!signature) {
      toast.error('Please enter your signature');
      return;
    }
    verifySignatureMutation.mutate({
      did: didAddress,
      challenge,
      signature
    });
  };

  const myDIDs = wallets.map(w => `did:xrpl:${w.classic_address}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-indigo-600 rounded-full mb-4">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DID Authentication</h1>
          <p className="text-gray-600">Secure login with your Decentralized Identity</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center gap-2 ${step === 'select' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'select' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="text-sm font-medium hidden sm:inline">Select DID</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 'challenge' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'challenge' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="text-sm font-medium hidden sm:inline">Sign</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 'verify' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'verify' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="text-sm font-medium hidden sm:inline">Verify</span>
          </div>
        </div>

        {/* Step 1: Select DID */}
        {step === 'select' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Your DID</CardTitle>
              <CardDescription>
                Choose a DID to authenticate with, or enter manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* My DIDs */}
              {myDIDs.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Your DIDs</label>
                  {myDIDs.map((did, idx) => (
                    <button
                      key={did}
                      onClick={() => handleSelectDID(did)}
                      className="w-full p-3 border rounded-lg hover:bg-indigo-50 hover:border-indigo-600 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-indigo-600" />
                          <span className="font-mono text-sm">{did.substring(0, 30)}...</span>
                        </div>
                        <Badge>Your DID</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual Entry */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Or enter DID manually</label>
                <Input
                  placeholder="did:xrpl:..."
                  value={didAddress}
                  onChange={(e) => setDidAddress(e.target.value)}
                  className="font-mono"
                />
                <Button
                  onClick={handleManualDID}
                  disabled={!didAddress || generateChallengeMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {generateChallengeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Challenge...
                    </>
                  ) : (
                    'Continue with DID'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Sign Challenge */}
        {step === 'challenge' && challenge && (
          <Card>
            <CardHeader>
              <CardTitle>Sign Authentication Challenge</CardTitle>
              <CardDescription>
                Sign this challenge with your DID's private key
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-xs text-gray-600 mb-2">Challenge Data:</div>
                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-all">
                  {JSON.stringify(challenge, null, 2)}
                </pre>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">How to sign:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy the challenge data above</li>
                      <li>Use your XRPL wallet to sign the message</li>
                      <li>Paste the signature below</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Signature</label>
                <Input
                  placeholder="Enter signature hex..."
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('select');
                    setChallenge(null);
                    setSignature('');
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={!signature || verifySignatureMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {verifySignatureMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify & Login
                    </>
                  )}
                </Button>
              </div>

              {/* Demo Mode Helper */}
              <div className="text-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSignature('demo_signature_' + Math.random().toString(36))}
                  className="text-xs text-gray-500"
                >
                  Use Demo Signature (for testing)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
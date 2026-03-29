import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wallet, Shield, CheckCircle, ArrowRight, Key } from 'lucide-react';

export default function NewcomerDashboard() {
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [step, setStep] = useState('wallet'); // wallet | did | done
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [didPublished, setDidPublished] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('sb_invite_session');
    if (!stored) {
      navigate('/');
      return;
    }
    try {
      setInvite(JSON.parse(stored));
    } catch {
      navigate('/');
    }
  }, []);

  const handleCreateWallet = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('createWallet', { network: 'testnet' });
      const wallet = res.data;
      setWalletAddress(wallet.classic_address || wallet.address || 'Created');
      setStep('did');
    } catch (e) {
      setError('Failed to create wallet: ' + e.message);
    }
    setLoading(false);
  };

  const handlePublishDID = async () => {
    setLoading(true);
    setError('');
    try {
      await base44.functions.invoke('publishDID', {});
      setDidPublished(true);
      setStep('done');
    } catch (e) {
      setError('DID publish failed: ' + e.message);
    }
    setLoading(false);
  };

  const handleEnterVillage = () => {
    navigate('/dashboard');
  };

  if (!invite) return null;

  const steps = [
    { key: 'wallet', label: 'Create Wallet' },
    { key: 'did', label: 'Publish DID' },
    { key: 'done', label: 'Enter Village' },
  ];
  const currentStepIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
            alt="SoulBridge"
            className="w-12 h-12 rounded-xl mx-auto mb-3 object-contain"
          />
          <h1 className="text-white text-2xl font-light">Welcome, <span className="text-purple-300 font-semibold">{invite.recipient_nickname}</span></h1>
          <p className="text-white/40 text-sm mt-1">Your SoulBridge journey begins here</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
              Invite: {invite.token_id}
            </Badge>
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
              ⚡ {invite.kinetic_weight} KU Starting Weight
            </Badge>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < currentStepIdx ? 'bg-green-500 text-white' :
                i === currentStepIdx ? 'bg-purple-500 text-white ring-2 ring-purple-400/40' :
                'bg-white/10 text-white/30'
              }`}>
                {i < currentStepIdx ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px ${i < currentStepIdx ? 'bg-green-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Cards */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">

          {step === 'welcome' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-purple-300" />
              </div>
              <div>
                <h2 className="text-white text-lg font-semibold mb-2">You're In</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  You've been granted access to SoulBridge. Your first step is to create your own XRPL wallet — this becomes your sovereign identity on the Village.
                </p>
              </div>
              {invite.notes && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-amber-300 text-xs italic">"{invite.notes}"</p>
                </div>
              )}
              <div className="space-y-2 text-left">
                {['Auto-funded XRPL testnet wallet (13 XRP)', 'Publish your Decentralised ID on XRPL', 'Enter the Village as a Citizen'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/50 text-xs">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                    {item}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setStep('wallet')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-11 gap-2"
              >
                Begin <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 'wallet' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/30 flex items-center justify-center mx-auto">
                <Wallet className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <h2 className="text-white text-lg font-semibold mb-2">Create Your Wallet</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  We'll generate a fresh XRPL testnet wallet for you and automatically fund it with <span className="text-yellow-300 font-semibold">13 XRP</span> — covering the full DID reserve requirement. No XRP needed from you.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-left space-y-1">
                  <p className="text-yellow-300 text-xs font-semibold">What happens next:</p>
                  <p className="text-white/40 text-xs">✦ New XRPL testnet wallet generated</p>
                  <p className="text-white/40 text-xs">✦ 13 XRP sponsored for your DID reserve</p>
                  <p className="text-white/40 text-xs">✦ Ready to publish your sovereign identity</p>
                </div>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <Button
                onClick={handleCreateWallet}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white h-11 gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
                ) : (
                  <><Wallet className="w-4 h-4" /> Create My Wallet</>
                )}
              </Button>
            </div>
          )}

          {step === 'did' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-400/30 flex items-center justify-center mx-auto">
                <Shield className="w-7 h-7 text-green-300" />
              </div>
              <div>
                <h2 className="text-white text-lg font-semibold mb-2">Publish Your DID</h2>
                {walletAddress && walletAddress !== 'Created' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 mb-3">
                    <p className="text-green-300 text-xs font-mono break-all">{walletAddress}</p>
                  </div>
                )}
                <p className="text-white/50 text-sm leading-relaxed">
                  Anchor your decentralised identity on the XRPL. This makes you a verifiable sovereign agent in the Village.
                </p>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <Button
                onClick={handlePublishDID}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-11 gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</>
                ) : (
                  <><Shield className="w-4 h-4" /> Publish My DID</>
                )}
              </Button>
              <button
                onClick={() => setStep('done')}
                className="text-white/30 text-xs hover:text-white/50 transition-colors"
              >
                Skip for now →
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border border-amber-400/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <h2 className="text-white text-lg font-semibold mb-2">You're Ready</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  {didPublished
                    ? 'Your wallet is created and your DID is published on XRPL. Welcome to the Village.'
                    : 'Your wallet is created. You can publish your DID from the dashboard at any time.'}
                </p>
              </div>
              <Button
                onClick={handleEnterVillage}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-11 gap-2"
              >
                <Sparkles className="w-4 h-4" /> Enter the Village
              </Button>
            </div>
          )}
        </div>

        <p className="text-white/20 text-[10px] text-center mt-6">
          SoulBridge · Invite-only · XRPL Testnet
        </p>
      </div>
    </div>
  );
}
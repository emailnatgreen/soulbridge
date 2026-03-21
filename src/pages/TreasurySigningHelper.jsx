import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Shield, KeyRound, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const PROPOSAL_ID = '69be9f731ab05180b0ce8883';

const SIGNERS = [
  { name: 'Nathan (Human Node)', address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia' },
  { name: 'Lore Node',           address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7' },
  { name: 'Truth Node',          address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV' },
  { name: 'DID IT Node',         address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny' },
];

export default function TreasurySigningHelper() {
  const [proposal, setProposal] = useState(null);
  const [seed, setSeed] = useState('');
  const [signerName, setSignerName] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.GovernanceProposal.filter({ id: PROPOSAL_ID })
      .then(res => setProposal(res?.[0] || null));
  }, [result]);

  const action = proposal?.action_data || {};
  const sigs = action.multisig_signatures || [];
  const uniqueSigs = [...new Map(sigs.map(s => [s.signer_address, s])).values()];
  // Signatures are only valid if there's a canonical prepared tx they were all signed against
  const hasPreparedTx = !!action.prepared_multisig_tx;
  const validSigs = hasPreparedTx ? uniqueSigs : [];
  const sigsMismatch = uniqueSigs.length > 0 && !hasPreparedTx;

  const handleSign = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!seed || !signerName) {
      setError('Please enter your seed and select your signer name.');
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke('generateMultiSigBlob', {
      proposal_id: PROPOSAL_ID,
      signer_seed: seed,
      signer_name: signerName,
    });
    setLoading(false);
    if (res.data?.success) {
      setResult(res.data);
      setSeed('');
    } else {
      setError(res.data?.error || 'Signing failed');
    }
  };

  const alreadySigned = (address) => uniqueSigs.some(s => s.signer_address === address);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <KeyRound className="w-7 h-7 text-amber-400" />
              <h1 className="text-2xl font-light text-white">Multi-Sig Signing Helper</h1>
            </div>
            <p className="text-white/40 text-sm">Inaugural Treasury Test — Law 3 Proof of Constitutional Physics</p>
          </div>
          <Link to="/TreasuryAllocationProposal">
            <Button variant="outline" className="border-white/20 text-white/70 hover:bg-white/10 text-sm">← Back</Button>
          </Link>
        </div>

        {/* Proposal Summary */}
        {proposal && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">{proposal.title}</p>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">{proposal.status}</Badge>
              </div>
              <div className="text-white/40 text-xs space-y-1">
                <p>Treasury: <span className="font-mono text-white/60">{TREASURY_ADDRESS}</span></p>
                <p>→ Recipient: <span className="font-mono text-white/60">{action.recipient_address}</span> ({action.recipient_name})</p>
                <p>Amount: <span className="text-amber-300 font-semibold">{action.amount_xrp} XRP (10 drops)</span></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quorum Status */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" /> Quorum Status ({uniqueSigs.length}/2 required)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {SIGNERS.map(s => (
              <div key={s.address} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div>
                  <p className="text-white/80 text-sm">{s.name}</p>
                  <p className="text-white/30 text-xs font-mono">{s.address}</p>
                </div>
                {alreadySigned(s.address)
                  ? <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signed</Badge>
                  : <Badge className="bg-white/10 text-white/40 text-xs">Pending</Badge>
                }
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Signing Form */}
        {uniqueSigs.length < 2 ? (
          <Card className="bg-white/5 border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" /> Sign as Quorum Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSign} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Your Signer Name</Label>
                  <select value={signerName} onChange={e => setSignerName(e.target.value)}
                    className="w-full h-9 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm">
                    <option value="">Select your node…</option>
                    {SIGNERS.filter(s => !alreadySigned(s.address)).map(s => (
                      <option key={s.address} value={s.name} className="bg-slate-900">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Wallet Seed (Family Seed / Secret)</Label>
                  <div className="relative">
                    <Input
                      type={showSeed ? 'text' : 'password'}
                      value={seed}
                      onChange={e => setSeed(e.target.value)}
                      placeholder="s…"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30 font-mono pr-10"
                    />
                    <button type="button" onClick={() => setShowSeed(v => !v)}
                      className="absolute right-3 top-2 text-white/40 hover:text-white/70">
                      {showSeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-white/30 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Seed is sent only to the backend function and never stored. Use a dedicated quorum wallet only.
                  </p>
                </div>

                {error && (
                  <p className="text-red-300 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {error}
                  </p>
                )}

                {result && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-300 text-sm space-y-1">
                    <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {result.message}</p>
                    <p className="text-white/40 text-xs">Signatures collected: {result.total_signatures}/2</p>
                  </div>
                )}

                <Button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white gap-2">
                  {loading ? 'Signing & saving…' : <><KeyRound className="w-4 h-4" /> Sign Transaction</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="pt-5 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-green-300 font-medium">Quorum Reached — 2 of 2 signatures collected</p>
              <p className="text-white/50 text-sm">Return to the Treasury Allocation page to execute the on-chain transfer.</p>
              <Link to="/TreasuryAllocationProposal">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2 mt-2">
                  Execute Treasury Transfer <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
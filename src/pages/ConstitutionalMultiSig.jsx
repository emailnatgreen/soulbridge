import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, CheckCircle, ExternalLink, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';



const TREASURY = { name: 'Axi Treasury', address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h' };

const SIGNERS = [
  { name: 'Code Node', address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P', weight: 1, color: 'text-blue-400' },
  { name: 'Lore Node', address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', weight: 1, color: 'text-emerald-400' },
  { name: 'Zoe', address: 'rQw4rtbkJGFFfJJUUtrewnQJHggLXTzWrE', weight: 2, color: 'text-pink-400' },
  { name: 'Human / Nathan', address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', weight: 3, color: 'text-amber-400' },
];

export default function ConstitutionalMultiSig() {

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const pollRef = useRef(null);

  const pollForTxHash = (payloadUuid) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) { clearInterval(pollRef.current); return; }
      try {
        const res = await base44.functions.invoke('xummCheckPayload', { payload_uuid: payloadUuid });
        const hash = res.data?.response?.txid || res.data?.txid;
        if (hash) {
          setTxHash(hash);
          clearInterval(pollRef.current);
          toast.success('Transaction signed on XRPL! 🎉');
        }
      } catch (e) { /* keep polling */ }
    }, 5000);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setTxHash(null);
    try {
      const res = await base44.functions.invoke('setupConstitutionalMultiSig', { account: TREASURY.address });
      setResult(res.data);
      if (res.data?.xumm_url) {
        window.open(res.data.xumm_url, '_blank');
      }
      if (res.data?.payload_uuid) {
        toast.info('Check Xumm app for signing request from all 4 signers');
        pollForTxHash(res.data.payload_uuid);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create payload');
    }
    setLoading(false);
  };

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    toast.success('Copied!');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Constitutional Multi-Sig</h1>
            <p className="text-slate-500 text-sm">4 Signers on Axi Treasury — Quorum 4 of 7</p>
          </div>
        </div>

        {/* Signer Table */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-3">Account</p>
            <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Badge className="text-[10px] bg-purple-800 border-purple-600 text-purple-300">Treasury</Badge>
                <span className="text-white text-sm font-medium">{TREASURY.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-mono hidden sm:block">{TREASURY.address.slice(0, 8)}…{TREASURY.address.slice(-6)}</span>
                <button onClick={() => copyAddress(TREASURY.address)} className="text-slate-600 hover:text-white transition">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-semibold uppercase mb-3 mt-4">4 Signers</p>
            {SIGNERS.map(s => (
              <div key={s.address} className="flex items-center justify-between gap-2 py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] bg-slate-800 border-slate-700 ${s.color}`}>W{s.weight}</Badge>
                  <span className="text-white text-sm font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-mono hidden sm:block">{s.address.slice(0, 8)}…{s.address.slice(-6)}</span>
                  <button onClick={() => copyAddress(s.address)} className="text-slate-600 hover:text-white transition">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400 text-sm">Total Weight</span>
              <span className="text-white text-sm font-mono">7</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 text-sm">Quorum</span>
              <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">4 of 7</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Selector */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-slate-500 font-semibold uppercase">Target Account</p>
            <div className="p-3 rounded-lg border border-purple-500/50 bg-purple-600/10">
              <p className="text-white text-sm font-medium">{TREASURY.name}</p>
              <p className="text-slate-500 text-[11px] font-mono">{TREASURY.address}</p>
              <p className="text-purple-400 text-[10px] mt-0.5">SignerListSet will be applied to this account</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2 h-12 text-base"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          {loading ? 'Creating Xumm Payload...' : 'Submit SignerListSet via Xumm'}
        </Button>

        {/* Result */}
        {result && (
          <Card className="bg-green-900/20 border-green-600/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="font-semibold text-sm">Xumm payload created — sign in app</span>
              </div>
              {result.qr_url && (
                <img src={result.qr_url} alt="Xumm QR" className="w-40 h-40 mx-auto rounded-xl border border-slate-700" />
              )}
              <a
                href={result.xumm_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-700/30 text-green-300 text-sm hover:bg-green-700/50 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Xumm
              </a>
              <p className="text-slate-500 text-[11px] text-center">Payload UUID: {result.payload_uuid}</p>
              {txHash ? (
                <a
                  href={`https://xrpscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-700/30 text-blue-300 text-sm hover:bg-blue-700/50 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on XRPScan
                </a>
              ) : (
                <p className="text-slate-600 text-[11px] text-center animate-pulse">⏳ Waiting for signature... XRPScan link will appear once signed.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
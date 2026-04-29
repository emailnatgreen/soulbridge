import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function ActivationCodeEntry({ onRedeemed }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, message, widget_name } or { error }

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await base44.functions.invoke('redeemActivationCode', { code: code.trim() });
      setResult({ success: true, message: res.data.message, widget_name: res.data.widget_name });
      setCode('');
      onRedeemed?.();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Something went wrong';
      setResult({ success: false, error: msg });
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/15 border border-amber-500/20 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-semibold text-sm">Redeem Activation Code</h3>
      </div>

      <p className="text-white/40 text-xs leading-relaxed">
        Purchased an NFT from{' '}
        <a href="https://didits.store" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-0.5">
          didits.store <ExternalLink className="w-2.5 h-2.5" />
        </a>
        ? Enter your activation code below to unlock it on your dashboard.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="SB-XXXX-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
          disabled={loading}
          className="bg-black/30 border-white/10 text-white placeholder:text-white/20 font-mono text-sm tracking-wider"
        />
        <Button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-4 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
        </Button>
      </div>

      {result && (
        <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${
          result.success
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-xs ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
            {result.success ? result.message : result.error}
          </p>
        </div>
      )}
    </div>
  );
}
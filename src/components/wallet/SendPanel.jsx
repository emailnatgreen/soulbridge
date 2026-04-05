import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, CheckCircle, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CURRENCIES = [
  { value: 'xrp', label: 'XRP' },
  { value: 'rlusd', label: 'RLUSD' },
];

export default function SendPanel({ wallets }) {
  const [currency, setCurrency] = useState('xrp');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [destinationTag, setDestinationTag] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const validWallets = (wallets || []).filter(w => w.classic_address);

  // Auto-select first wallet
  React.useEffect(() => {
    if (validWallets.length > 0 && !selectedWallet) {
      setSelectedWallet(validWallets[0].id);
    }
  }, [validWallets.length]);

  const handleSend = async () => {
    if (!recipient.trim()) { toast.error('Enter a recipient address'); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter an amount'); return; }
    if (!selectedWallet) { toast.error('Select a wallet'); return; }

    setSending(true);
    setResult(null);

    if (currency === 'xrp') {
      const res = await base44.functions.invoke('sendXRP', {
        wallet_id: selectedWallet,
        recipient_address: recipient.trim(),
        amount: parseFloat(amount),
        destination_tag: destinationTag ? parseInt(destinationTag) : undefined,
        note: note || undefined,
      });
      const data = res?.data;
      if (data?.error) {
        setResult({ success: false, error: data.error });
        toast.error(data.error);
      } else {
        setResult({ success: true, hash: data?.hash || data?.tx_hash });
        toast.success('XRP sent successfully!');
      }
    } else {
      // RLUSD send
      const res = await base44.functions.invoke('sendXRP', {
        wallet_id: selectedWallet,
        recipient_address: recipient.trim(),
        amount: parseFloat(amount),
        currency: 'RLUSD',
        note: note || undefined,
      });
      const data = res?.data;
      if (data?.error) {
        setResult({ success: false, error: data.error });
        toast.error(data.error);
      } else {
        setResult({ success: true, hash: data?.hash || data?.tx_hash });
        toast.success('RLUSD sent successfully!');
      }
    }
    setSending(false);
  };

  const resetForm = () => {
    setResult(null);
    setRecipient('');
    setAmount('');
    setDestinationTag('');
    setNote('');
  };

  if (validWallets.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
        <Send className="w-6 h-6 text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">No wallets available for sending</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Send className="w-4 h-4 text-orange-400" /> Send {currency === 'xrp' ? 'XRP' : 'RLUSD'}
        </h3>
        <span className="text-[9px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full">XRPL Mainnet</span>
      </div>

      {!result ? (
        <div className="space-y-3">
          {/* Currency toggle */}
          <div className="flex gap-2">
            {CURRENCIES.map(c => (
              <button key={c.value} onClick={() => setCurrency(c.value)}
                className={`flex-1 text-xs py-2 rounded-lg border transition-all font-semibold ${
                  currency === c.value
                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                }`}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Wallet selector */}
          {validWallets.length > 1 && (
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">From Wallet</label>
              <select value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-400/60 appearance-none">
                {validWallets.map(w => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                    {w.name || w.classic_address.slice(0, 16) + '…'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient */}
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Recipient Address</label>
            <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-orange-400/60" />
          </div>

          {/* Amount */}
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Amount ({currency === 'xrp' ? 'XRP' : 'RLUSD'})</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-lg font-bold placeholder:text-white/15 focus:outline-none focus:border-orange-400/60" />
          </div>

          {/* Destination Tag (XRP only) */}
          {currency === 'xrp' && (
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Destination Tag (optional)</label>
              <input type="number" value={destinationTag} onChange={e => setDestinationTag(e.target.value)}
                placeholder="Optional"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-orange-400/60" />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="What's this for?"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-orange-400/60" />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-300/70">Transactions on XRPL mainnet are irreversible. Double-check the recipient address.</p>
          </div>

          <Button onClick={handleSend} disabled={sending || !recipient || !amount}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white gap-2 text-sm h-11">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send {currency === 'xrp' ? 'XRP' : 'RLUSD'}</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {result.success ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
              <p className="text-green-300 font-semibold text-sm">Sent Successfully!</p>
              {result.hash && (
                <a href={`https://xrpscan.com/tx/${result.hash}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <ExternalLink className="w-3 h-3" /> View on XRPScan
                </a>
              )}
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center space-y-2">
              <XCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-red-300 font-semibold text-sm">Send Failed</p>
              <p className="text-white/40 text-xs">{result.error || 'Please try again.'}</p>
            </div>
          )}
          <Button onClick={resetForm} className="w-full bg-white/10 hover:bg-white/15 text-white gap-2 text-sm">
            New Transaction
          </Button>
        </div>
      )}
    </div>
  );
}
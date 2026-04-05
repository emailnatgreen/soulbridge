import React, { useState } from 'react';
import { Download, Copy, CheckCircle, QrCode } from 'lucide-react';
import { toast } from 'sonner';

export default function ReceivePanel({ wallets }) {
  const [selectedWallet, setSelectedWallet] = useState('');
  const [copied, setCopied] = useState(false);

  const validWallets = (wallets || []).filter(w => w.classic_address);

  React.useEffect(() => {
    if (validWallets.length > 0 && !selectedWallet) {
      setSelectedWallet(validWallets[0].id);
    }
  }, [validWallets.length]);

  const wallet = validWallets.find(w => w.id === selectedWallet);
  const address = wallet?.classic_address || '';

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (validWallets.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
        <Download className="w-6 h-6 text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">No wallets available for receiving</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Download className="w-4 h-4 text-green-400" /> Receive XRP / RLUSD
        </h3>
        <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">XRPL Mainnet</span>
      </div>

      {/* Wallet selector */}
      {validWallets.length > 1 && (
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Receive To</label>
          <select value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400/60 appearance-none">
            {validWallets.map(w => (
              <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                {w.name || w.classic_address.slice(0, 16) + '…'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Address display */}
      <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-4 h-4 text-green-400" />
          <span className="text-white/40 text-[10px] uppercase tracking-widest">Your Wallet Address</span>
        </div>

        {wallet?.name && (
          <p className="text-white/60 text-xs">{wallet.name}</p>
        )}

        <p className="text-green-300 font-mono text-xs sm:text-sm break-all select-all cursor-pointer hover:text-green-200 transition-colors">
          {address}
        </p>

        <button onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
            copied
              ? 'bg-green-500/20 border-green-500/40 text-green-300'
              : 'bg-white/5 border-white/15 text-white/60 hover:text-white hover:bg-white/10'
          }`}>
          {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Address</>}
        </button>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <p className="text-white/30 text-[10px] uppercase tracking-widest">How to receive</p>
        <div className="space-y-1.5">
          {[
            'Share your address above with the sender',
            'They can send XRP or RLUSD to this address',
            'RLUSD requires an active trustline (set up in wallet management)',
            'Funds will appear once confirmed on the XRPL ledger',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] text-white/20 font-mono mt-0.5">{i + 1}.</span>
              <p className="text-white/40 text-xs">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
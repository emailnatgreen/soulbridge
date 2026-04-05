import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { QrCode, Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function WalletQRCodes({ wallet }) {
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(null);

  const address = wallet.classic_address;

  // Determine if we have a plain-text seed (no encryption iv/salt means legacy plain seed)
  const hasPlainSeed = wallet.encrypted_seed && !wallet.encryption_iv && !wallet.encryption_salt;
  const seed = hasPlainSeed ? wallet.encrypted_seed : null;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Address QR */}
      <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <QrCode className="w-3 h-3" /> Receive Address
          </p>
          <Button
            size="sm" variant="ghost"
            onClick={() => handleCopy(address, 'Address')}
            className="text-white/40 hover:text-white h-6 px-2 text-[10px] gap-1"
          >
            {copied === 'Address' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            Copy
          </Button>
        </div>
        <div className="flex justify-center">
          <div className="bg-white rounded-xl p-3">
            <QRCode value={address} size={140} level="M" renderAs="svg" />
          </div>
        </div>
        <p className="text-purple-300 font-mono text-[10px] text-center break-all select-all">{address}</p>
        <p className="text-white/20 text-[9px] text-center">Scan to send XRP or RLUSD to this wallet</p>
      </div>

      {/* Seed QR — only for plain-text seeds */}
      {seed ? (
        <div className="bg-black/30 border border-red-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-red-400/70 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Secret Seed (Xumm Import)
            </p>
            <div className="flex items-center gap-1">
              {showSeed && (
                <Button
                  size="sm" variant="ghost"
                  onClick={() => handleCopy(seed, 'Seed')}
                  className="text-white/40 hover:text-white h-6 px-2 text-[10px] gap-1"
                >
                  {copied === 'Seed' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </Button>
              )}
              <Button
                size="sm" variant="ghost"
                onClick={() => setShowSeed(!showSeed)}
                className="text-white/40 hover:text-white h-6 px-2 text-[10px] gap-1"
              >
                {showSeed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSeed ? 'Hide' : 'Reveal'}
              </Button>
            </div>
          </div>

          {showSeed ? (
            <>
              <div className="flex justify-center">
                <div className="bg-white rounded-xl p-3">
                  <QRCode value={seed} size={140} level="M" renderAs="svg" />
                </div>
              </div>
              <p className="text-red-300/60 font-mono text-[10px] text-center break-all select-all">{seed}</p>
            </>
          ) : (
            <div className="flex justify-center py-4">
              <div className="bg-white/5 border border-white/10 rounded-xl w-[164px] h-[164px] flex items-center justify-center">
                <div className="text-center space-y-1.5">
                  <EyeOff className="w-5 h-5 text-white/20 mx-auto" />
                  <p className="text-white/20 text-[9px]">Click Reveal to show</p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <p className="text-red-300/60 text-[9px] leading-relaxed">
              ⚠️ This is the wallet's secret seed. Scan it in Xumm → Settings → Accounts → Add Account → Import to add this wallet. Never share this with anyone.
            </p>
          </div>
        </div>
      ) : wallet.encrypted_seed ? (
        <div className="bg-black/20 border border-white/5 rounded-xl px-4 py-3">
          <p className="text-white/20 text-[10px] flex items-center gap-1.5">
            <QrCode className="w-3 h-3" /> Seed QR unavailable — wallet uses encrypted storage
          </p>
        </div>
      ) : (
        <div className="bg-black/20 border border-white/5 rounded-xl px-4 py-3">
          <p className="text-white/20 text-[10px] flex items-center gap-1.5">
            <QrCode className="w-3 h-3" /> No seed stored — tracking-only wallet
          </p>
        </div>
      )}
    </div>
  );
}
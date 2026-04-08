import React, { useState, useEffect } from 'react';
import { Shield, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function DIDPresenceBadge() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [did, setDid] = useState(null);

  useEffect(() => {
    // Try local storage first (fast)
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const identity = JSON.parse(stored);
        if (identity?.did) setDid(identity.did);
      }
    } catch (_) {}

    // Then try fetching from wallets
    const loadDid = async () => {
      try {
        const wallets = await base44.entities.Wallet.filter({ owner_id: user?.id }, '-created_date', 1);
        if (wallets?.[0]?.classic_address) {
          setDid(`did:xrpl:1:${wallets[0].classic_address}`);
        }
      } catch (_) {}
    };
    if (user?.id) loadDid();
  }, [user?.id]);

  if (!did) return null;

  const shortDid = `${did.slice(0, 16)}...${did.slice(-6)}`;
  const xrplAddress = did.replace('did:xrpl:1:', '');
  const xrplLink = `https://xrpscan.com/account/${xrplAddress}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(did);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-900/30 border border-purple-500/30 hover:bg-purple-900/50 transition-all group"
        title="Your Sovereign DID"
      >
        <Shield className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
        <span className="text-purple-300 text-xs font-mono hidden sm:block">{shortDid}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 z-50 w-80 bg-slate-900 border border-purple-500/30 rounded-xl p-4 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Sovereign Identity</p>
                  <p className="text-purple-300 text-xs">XRPL Verified DID</p>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>

              <div className="bg-black/30 rounded-lg p-3 mb-3">
                <p className="text-purple-200 text-xs font-mono break-all leading-relaxed">{did}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-800/40 hover:bg-purple-800/60 text-purple-300 text-xs transition-all"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy DID'}
                </button>
                <a
                  href={xrplLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-800/40 hover:bg-blue-800/60 text-blue-300 text-xs transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View On-Chain
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
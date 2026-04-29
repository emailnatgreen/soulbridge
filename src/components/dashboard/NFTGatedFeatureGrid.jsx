import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Lock, ChevronRight, Hammer, Store, Bot, Coins, Shield, Sparkles, ArrowDownUp, Fingerprint, Sprout
} from 'lucide-react';

/**
 * All NFT-gated features rendered as dashboard cards.
 * Shows owned (unlocked) or locked state with route to feature or marketplace.
 */

const NFT_FEATURES = [
  {
    featurePath: 'wallet.create',
    label: 'Seed Golden Acorn',
    desc: 'Create & publish XRPL wallets',
    icon: Sprout,
    color: 'text-green-400',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    route: '/seed-golden-acorn',
    nftId: 'WIDGET-WM-002',
    price: '12 RLUSD',
  },
  {
    featurePath: '/rlusd-gate',
    label: 'RLUSD Trustline',
    desc: 'Activate RLUSD on your wallet',
    icon: Coins,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    route: '/rlusd-gate',
    nftId: 'WIDGET-TLG-001',
    price: '12 RLUSD',
  },
  {
    featurePath: '/nft-workshop',
    label: 'NFT Workshop',
    desc: 'Mint Widget & Agent NFTs',
    icon: Hammer,
    color: 'text-pink-400',
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/10',
    route: '/nft-workshop',
    nftId: 'WIDGET-WP-001',
    price: '90 RLUSD',
  },
  {
    featurePath: '/nft-workshop',
    label: 'AI Agent NFT',
    desc: 'Create unique AI Agent NFTs',
    icon: Bot,
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    route: '/nft-workshop',
    nftId: 'WIDGET-AIN-001',
    price: '80 RLUSD',
    dedupKey: 'ain-001',
  },
  {
    featurePath: '/storefront',
    label: 'Storefront',
    desc: 'Create & manage your shop',
    icon: Store,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    route: '/storefront',
    nftId: 'WIDGET-SFU-001',
    price: '60 RLUSD',
  },
];

export default function NFTGatedFeatureGrid({ isUnlocked, isAdmin }) {
  return (
    <div className="space-y-2.5">
      <p className="text-white/30 text-[10px] uppercase tracking-widest">NFT-Gated Features</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {NFT_FEATURES.map(feat => {
          const owned = isAdmin || isUnlocked(feat.featurePath);
          const Icon = feat.icon;
          return (
            <Link
              key={feat.dedupKey || feat.featurePath}
              to={owned ? feat.route : '/widget-marketplace'}
              className={`flex items-center gap-3 border rounded-2xl p-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] ${
                owned
                  ? `${feat.bg} ${feat.border} hover:opacity-90`
                  : 'bg-white/5 border-white/10 opacity-70 hover:opacity-90'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                owned ? `${feat.bg}` : 'bg-white/10'
              }`}>
                {owned ? (
                  <Icon className={`w-5 h-5 ${feat.color}`} />
                ) : (
                  <Lock className="w-4 h-4 text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-semibold ${owned ? 'text-white' : 'text-white/50'}`}>{feat.label}</p>
                  {owned && (
                    <span className="text-[8px] text-green-300 bg-green-500/20 border border-green-500/30 px-1.5 py-0.5 rounded-full">Owned</span>
                  )}
                </div>
                <p className="text-white/40 text-[10px] truncate">
                  {owned ? feat.desc : `${feat.price} · NFT required`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
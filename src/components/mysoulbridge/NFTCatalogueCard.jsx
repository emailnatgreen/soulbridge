import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, ChevronDown, ChevronUp, ExternalLink, ShoppingCart, Sparkles } from 'lucide-react';

const CATEGORY_COLORS = {
  did_management: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', label: 'Identity' },
  wallet_management: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', label: 'Wallet' },
  skill: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', label: 'Skill' },
  agent_creation: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300', label: 'Agent' },
  governance: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', label: 'Governance' },
  environment: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', label: 'Environment' },
  other: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-300', label: 'Other' },
};

const UNLOCKS_MAP = {
  'wallet.did_linking': [
    'Publish your DID on XRPL mainnet',
    'Manage wallets & privacy settings',
    'Access verification certificates',
    'Unlock full Village dashboard (Governance, Agents, Skills, Wallets, Kinetic Grid)',
  ],
  'wallet.create': [
    'Create additional XRPL wallets',
    'Link wallets to your DID',
    'Multi-wallet management',
  ],
  '/storefront': [
    'Create your own storefront',
    'Sell products & services for RLUSD',
    'PayPal fiat rail via DIDit',
    'Manage listings & orders',
  ],
  '/nft-workshop': [
    'Mint custom Widget NFTs',
    'Design metadata & economics',
    'WebMCP manifest creation',
  ],
  '/nft-workshop#ai-agent': [
    'Mint AI Agent NFTs with unique DIDs',
    'Define agent personality, role & bio',
    'Configure RLUSD pricing & royalties',
    'Soul-bound, non-transferable agents',
  ],
  '/nft-workshop#chrome-ski': [
    'Mint Chrome Skill NFTs',
    'Define skill instructions & triggers',
    'Google Chrome Skills ecosystem integration',
  ],
  '/chrome-skills': [
    'Connect to Google Chrome Skills ecosystem',
    'Upload & display agent skills publicly',
    'Chrome Gemini Side Panel integration',
  ],
  'monitorRLUSDNews': [
    'Real-time RLUSD stablecoin intelligence',
    'Market sentiment analysis',
    'Regulatory update tracking',
    '/ScoutRLUSD Chrome command',
  ],
};

// Master key unlocks everything
const SOVEREIGN_SEED_UNLOCKS = [
  'Full citizenship — all Village features unlocked',
  'Governance voting & proposals',
  'AI Agent creation & management',
  'Skills development & training',
  'Wallet management & DID publishing',
  'Kinetic Grid participation',
  'Marketplace & storefront access',
  'NFT Workshop access',
  'Chrome Skills integration',
  '/Macros Chrome command',
];

export default function NFTCatalogueCard({ widget, isOwned, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_COLORS[widget.category] || CATEGORY_COLORS.other;
  
  const isSovereignSeed = widget.nft_id === 'WIDGET-SS-001';
  const unlocks = isSovereignSeed
    ? SOVEREIGN_SEED_UNLOCKS
    : UNLOCKS_MAP[widget.feature_path] || [];

  const price = widget.cost_per_stream_interval;
  const isMinted = widget.mint_status === 'minted_mainnet';
  const isTest = widget.name?.toLowerCase().includes('test') || widget.nft_id === 'WIDGET-TST-001';

  if (isTest && !isAdmin) return null;

  return (
    <div className={`rounded-2xl border transition-all ${
      isOwned 
        ? 'border-green-500/30 bg-green-500/[0.03]' 
        : 'border-white/10 bg-white/[0.02]'
    }`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Image or Icon */}
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
          {widget.image_url ? (
            <img src={widget.image_url} alt={widget.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full ${cat.bg} flex items-center justify-center`}>
              <Sparkles className={`w-5 h-5 ${cat.text}`} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold text-sm">{widget.name}</h3>
            {isOwned ? (
              <Badge className="bg-green-500/15 text-green-300 border-green-500/30 text-[9px] gap-1">
                <Unlock className="w-2.5 h-2.5" /> Owned
              </Badge>
            ) : (
              <Badge className="bg-white/5 text-white/40 border-white/10 text-[9px] gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className={`${cat.bg} ${cat.text} ${cat.border} text-[9px]`}>{cat.label}</Badge>
            {isMinted && (
              <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-[9px]">On-Chain</Badge>
            )}
            {isSovereignSeed && (
              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[9px]">Master Key</Badge>
            )}
            {price > 0 && (
              <span className="text-white/30 text-[10px]">{price} RLUSD</span>
            )}
          </div>
        </div>

        {/* Expand */}
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Description */}
          <p className="text-white/50 text-xs leading-relaxed">
            {widget.description?.slice(0, 300)}{widget.description?.length > 300 ? '…' : ''}
          </p>

          {/* What it unlocks */}
          {unlocks.length > 0 && (
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1.5">What this unlocks</p>
              <div className="space-y-1">
                {unlocks.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOwned ? 'bg-green-400' : 'bg-white/20'}`} />
                    <span className={isOwned ? 'text-green-200/70' : 'text-white/40'}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NFT Metadata */}
          <div className="grid grid-cols-2 gap-2">
            {widget.nft_id && (
              <div className="bg-black/20 rounded-lg px-2.5 py-1.5">
                <p className="text-white/25 text-[8px] uppercase">NFT ID</p>
                <p className="text-white/50 text-[10px] font-mono">{widget.nft_id}</p>
              </div>
            )}
            {widget.widget_type && (
              <div className="bg-black/20 rounded-lg px-2.5 py-1.5">
                <p className="text-white/25 text-[8px] uppercase">Type</p>
                <p className="text-white/50 text-[10px] capitalize">{widget.widget_type} · {widget.widget_class}</p>
              </div>
            )}
          </div>

          {/* XRPL Link */}
          {widget.xrpl_tx_hash && (
            <a
              href={`https://livenet.xrpl.org/transactions/${widget.xrpl_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-[10px] transition"
            >
              <ExternalLink className="w-3 h-3" /> View on XRPL Explorer
            </a>
          )}

          {/* Action */}
          {!isOwned && !isAdmin && (
            <Link
              to="/widget-marketplace"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold rounded-xl py-2.5 transition-all w-full"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Get from Marketplace
            </Link>
          )}

          {isOwned && widget.feature_path && (
            <Link
              to={widget.feature_path.startsWith('/') ? widget.feature_path : '/dashboard'}
              className="flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 text-xs font-semibold rounded-xl py-2.5 transition-all w-full"
            >
              <Unlock className="w-3.5 h-3.5" /> Open Feature
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
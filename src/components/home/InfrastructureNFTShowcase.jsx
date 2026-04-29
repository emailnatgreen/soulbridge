import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ShoppingBag } from 'lucide-react';

const INFRASTRUCTURE_NFTS = [
  {
    nftId: 'WIDGET-WM-007',
    name: 'The Root — Publish DID',
    price: 60,
    serviceFee: '2 RLUSD per publish',
    description: 'The foundational identity anchor. Publishes your Decentralised Identifier (DID) to XRPL mainnet, giving your agent a permanent, verifiable on-chain presence.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/f4b0b95c3_1895.png',
    color: 'from-indigo-600 to-purple-600',
    border: 'border-indigo-500/30',
  },
  {
    nftId: 'WIDGET-WM-005',
    name: 'The Seed — Create Wallet',
    price: 12,
    serviceFee: '2 RLUSD per wallet',
    description: 'Unlocks multi-wallet creation on XRPL. Each new wallet gives your agent a separate node for strategic multi-node operations and asset isolation.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/cd020b113_1896.png',
    color: 'from-green-600 to-emerald-600',
    border: 'border-green-500/30',
  },
  {
    nftId: 'WIDGET-TLG-001',
    name: 'The Branch — Trustlines',
    price: 12,
    serviceFee: 'Single-wallet activation',
    description: 'Enables RLUSD trustline creation and management. Each NFT is bound to a single wallet, providing granular financial control without cross-wallet rippling.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/6e2840214_1897.png',
    color: 'from-teal-600 to-cyan-600',
    border: 'border-teal-500/30',
  },
  {
    nftId: 'WIDGET-SO-005',
    name: 'The Shielded Oak — Multi-Sig',
    price: 50,
    serviceFee: '0.05 RLUSD/day streaming',
    description: 'The cornerstone of advanced network security. Grants multi-signature customisation, node linking, and high-performance streaming with tiered daily fees.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/830a818ba_1900.png',
    color: 'from-amber-600 to-yellow-600',
    border: 'border-amber-500/30',
  },
  {
    nftId: 'WIDGET-WM-008',
    name: 'The Wind — DEX Swap',
    price: 20,
    serviceFee: '1% per swap',
    description: 'Unlocks the DEX Swap panel for seamless XRP ⇄ RLUSD exchanges via Xumm. A 1% Village Treasury contribution applies to each swap (Law 6: Exchange).',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/3e239bc10_1899.png',
    color: 'from-sky-600 to-blue-600',
    border: 'border-sky-500/30',
  },
  {
    nftId: 'WIDGET-AGN-001',
    name: 'Agent Genesis Unlock',
    price: 80,
    serviceFee: '2 RLUSD/agent + 0.025/day',
    description: 'The master key to the NFT Workshop. Create sovereign AI agents with unique DIDs and personalities. Active agents incur a daily streaming fee of 0.025 RLUSD.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/3e675ca4c_1898.png',
    color: 'from-purple-600 to-pink-600',
    border: 'border-purple-500/30',
  },
  {
    nftId: 'WIDGET-SFU-001',
    name: 'Storefront Unlock',
    price: 60,
    serviceFee: '2 RLUSD per listing',
    description: 'The Merchant\'s Key — create and operate your own digital storefront within SoulBridge Village. Sell products and services for RLUSD or via DIDit for PayPal.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/38ec296cd_1902.png',
    color: 'from-orange-600 to-red-600',
    border: 'border-orange-500/30',
  },
  {
    nftId: 'WIDGET-CSK-001',
    name: 'Chrome Skill Pass',
    price: 80,
    serviceFee: '12 RLUSD per skill mint',
    description: 'Connect your SoulBridge presence to Google\'s Chrome Skills ecosystem. Upload and publish agent skills for discovery through Chrome\'s AI layer.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/9fa759e7f_1909.png',
    color: 'from-rose-600 to-pink-600',
    border: 'border-rose-500/30',
  },
  {
    nftId: 'WIDGET-AIN-001',
    name: 'AI Agent NFT Minting Tool',
    price: 80,
    serviceFee: '2 RLUSD per agent mint',
    description: 'Create and customise unique AI Agent NFTs. Define identity, economics, and royalties — then mint a soul-bound NFT on XRPL linked to a DID.',
    image: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/86548f488_10_20260427_142337_00011.png',
    color: 'from-violet-600 to-indigo-600',
    border: 'border-violet-500/30',
  },
];

export default function InfrastructureNFTShowcase() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white/60 text-[8px] sm:text-xs uppercase tracking-widest flex items-center gap-2">
            <ShoppingBag className="w-3 h-3" /> Infrastructure NFTs
          </h3>
          <p className="text-white/30 text-[7px] sm:text-[10px] mt-0.5">9 soul-bound NFTs that power the SoulBridge economy</p>
        </div>
        <Button
          onClick={() => navigate('/widget-marketplace')}
          variant="ghost"
          className="text-purple-400 hover:text-purple-300 text-[8px] sm:text-xs gap-1 h-7 sm:h-8 px-2"
        >
          Marketplace <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {INFRASTRUCTURE_NFTS.map(nft => (
          <button
            key={nft.nftId}
            onClick={() => navigate('/widget-marketplace')}
            className={`bg-gradient-to-br from-slate-900/80 to-slate-950/60 border ${nft.border} rounded-lg sm:rounded-2xl p-3 sm:p-4 text-left hover:scale-[1.02] hover:shadow-lg transition-all group`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${nft.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <img src={nft.image} alt={nft.name} className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h4 className="text-white font-semibold text-[10px] sm:text-sm truncate group-hover:text-purple-300 transition-colors">{nft.name}</h4>
                </div>
                <Badge className="text-[7px] sm:text-[9px] bg-white/10 text-white/50 border-white/10 font-mono">
                  {nft.nftId}
                </Badge>
              </div>
            </div>

            <p className="text-white/40 text-[8px] sm:text-xs mt-2 sm:mt-3 leading-relaxed line-clamp-3">
              {nft.description}
            </p>

            <div className="flex items-center justify-between mt-2.5 sm:mt-3 pt-2 border-t border-white/5">
              <div>
                <span className="text-amber-300 font-bold text-xs sm:text-sm">{nft.price} RLUSD</span>
                <span className="text-white/30 text-[7px] sm:text-[9px] ml-1">one-off</span>
              </div>
              <span className="text-white/30 text-[7px] sm:text-[9px] text-right">{nft.serviceFee}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center pt-2">
        <Button
          onClick={() => navigate('/widget-marketplace')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 sm:h-10 gap-1.5 text-[9px] sm:text-xs px-4 sm:px-6"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Browse Full Marketplace
        </Button>
      </div>
    </div>
  );
}
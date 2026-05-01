import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, ExternalLink } from 'lucide-react';

const CHAPTERS = [
  { path: '/whitepaper/business', label: 'Overview', shortLabel: 'Overview', num: 0 },
  { path: '/whitepaper/business/economic-architecture', label: 'Economic Architecture', shortLabel: 'Architecture', num: 1 },
  { path: '/whitepaper/business/multi-wallet-companies', label: 'Multi-Wallet Companies', shortLabel: 'Wallets', num: 2 },
  { path: '/whitepaper/business/service-lifecycle', label: 'Service Lifecycle', shortLabel: 'Services', num: 3 },
  { path: '/whitepaper/business/pricing-treasury', label: 'Pricing & Treasury', shortLabel: 'Pricing', num: 4 },
  { path: '/whitepaper/business/agent-economy', label: 'Agent Economy', shortLabel: 'Agents', num: 5 },
  { path: '/whitepaper/business/storefronts', label: 'Storefront Marketplace', shortLabel: 'Storefronts', num: 6 },
  { path: '/whitepaper/business/widget-economy', label: 'Widget NFT Economy', shortLabel: 'Widgets', num: 7 },
  { path: '/whitepaper/business/didit-fiat', label: 'DIDit & Fiat Rails', shortLabel: 'DIDit', num: 8 },
  { path: '/whitepaper/business/smp-roadmap', label: 'SMP Micropayments Roadmap', shortLabel: 'SMP', num: 9 },
  { path: '/whitepaper/business/compliance-audit', label: 'Compliance & Audit', shortLabel: 'Compliance', num: 10 },
];

export { CHAPTERS };

export default function BusinessLayout({ children }) {
  const location = useLocation();
  const currentIdx = CHAPTERS.findIndex(c => c.path === location.pathname);
  const prev = currentIdx > 0 ? CHAPTERS[currentIdx - 1] : null;
  const next = currentIdx < CHAPTERS.length - 1 ? CHAPTERS[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png" alt="SoulBridge" className="w-7 h-7 rounded-lg object-contain" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <h1 className="text-white font-semibold text-sm truncate">Business Layer White Paper</h1>
              </div>
              <p className="text-white/30 text-[10px]">SoulBridge Foundation · v2.0 · May 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/whitepaper/governance" className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">Governance Paper</Link>
            <Link to="/" className="text-white/40 hover:text-white text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Home</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-0 lg:gap-8 px-4 py-6">
        <nav className="lg:w-56 flex-shrink-0 mb-6 lg:mb-0">
          <div className="lg:sticky lg:top-20 space-y-0.5 overflow-x-auto lg:overflow-x-visible">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2 hidden lg:block">Chapters</p>
            <div className="flex lg:flex-col gap-1 lg:gap-0.5 pb-2 lg:pb-0">
              {CHAPTERS.map((ch) => {
                const active = location.pathname === ch.path;
                return (
                  <Link key={ch.path} to={ch.path} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all whitespace-nowrap flex-shrink-0 ${active ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${active ? 'bg-amber-500/30 text-amber-200' : 'bg-white/10 text-white/40'}`}>{ch.num}</span>
                    <span className="hidden lg:inline">{ch.label}</span>
                    <span className="lg:hidden">{ch.shortLabel}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <main className="flex-1 min-w-0">
          <div className="prose-invert max-w-none">{children}</div>
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/10">
            {prev ? (<Link to={prev.path} className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm transition-colors"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">{prev.label}</span><span className="sm:hidden">{prev.shortLabel}</span></Link>) : <div />}
            {next ? (<Link to={next.path} className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm transition-colors"><span className="hidden sm:inline">{next.label}</span><span className="sm:hidden">{next.shortLabel}</span><ChevronRight className="w-4 h-4" /></Link>) : <div />}
          </div>
        </main>
      </div>

      <footer className="border-t border-white/10 bg-black/20 py-4 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-1">
          <p className="text-white/25 text-[10px]">© 2026 SoulBridge Foundation · Governed by 11 Laws of Honour · XRPL DID Architecture</p>
          <p className="text-white/15 text-[8px]">This document is for informational purposes. SoulBridge operates within UK FSMA 2026 pre-authorisation technical testing guidelines.</p>
        </div>
      </footer>
    </div>
  );
}
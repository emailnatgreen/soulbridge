import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SECTIONS = [
  {
    title: "What is XRPL?",
    content: "The XRP Ledger (XRPL) is one of the world's most advanced and energy-efficient blockchain networks. Created in 2012, it processes transactions in 3-5 seconds with negligible fees, making it ideal for real-world applications like SoulBridge.",
  },
  {
    title: "Why XRPL Mainnet?",
    content: "SoulBridge operates on the XRPL Mainnet — the live, production blockchain. This means every DID (Decentralized Identifier), every transaction, and every governance action is recorded on a real, immutable ledger. Not a test network. Not a simulation. The real thing.",
  },
  {
    title: "What Does This Mean for You?",
    content: "Your digital identity on SoulBridge is anchored to a real blockchain address. Your contributions are permanently recorded. Your XRP and RLUSD transactions are genuine. The 'XRPL Mainnet' badge confirms that SoulBridge is a live, production-grade system.",
  },
  {
    title: "Key Benefits",
    items: [
      "3-5 second transaction finality",
      "Negligible transaction fees (~0.00001 XRP)",
      "Carbon-neutral consensus mechanism",
      "Native support for DIDs and NFTs",
      "RLUSD stablecoin integration",
      "Decentralized exchange built into the ledger",
    ],
  },
  {
    title: "Learn More",
    content: "Visit the official XRPL documentation to explore the technology powering SoulBridge.",
    link: { url: "https://xrpl.org", label: "Visit xrpl.org" },
  },
];

export default function XRPLMainnetInfo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative flex flex-col overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: `url(https://media.base44.com/images/public/699319649276f1077c1f2c81/0d7462541_file_00000000e5c0720aa7cfd4053d3c23d9.png)`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center center', backgroundSize: '420px 420px', opacity: 0.05 }} />

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to SoulBridge</span>
            <span className="sm:hidden">Back</span>
          </a>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            XRPL Mainnet
          </Badge>
        </div>
      </nav>

      <div className="relative z-10 flex-1 px-4 py-8 sm:py-14 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8 snap-y snap-proximity">
          <div className="text-center snap-start">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-sm gap-1.5 px-4 py-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              XRPL Mainnet — Live
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">XRPL Mainnet</span>
            </h1>
            <p className="text-white/40 text-xs sm:text-sm">The backbone of SoulBridge's on-chain architecture</p>
          </div>

          {SECTIONS.map((section, i) => (
            <div key={i} className="bg-white/5 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-lg snap-start">
              <h2 className="text-white font-semibold text-base sm:text-lg mb-3">{section.title}</h2>
              {section.content && <p className="text-white/70 text-sm leading-relaxed">{section.content}</p>}
              {section.items && (
                <ul className="space-y-2 mt-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-white/70 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.link && (
                <a href={section.link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  {section.link.label}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md py-3">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-3 text-white/30 text-[10px]">
            <a href="/" className="hover:text-white/60 transition-colors">Home</a>
            <span>·</span>
            <a href="/about" className="hover:text-white/60 transition-colors">About</a>
            <span>·</span>
            <a href="/xaman-info" className="hover:text-white/60 transition-colors">Xaman</a>
            <span>·</span>
            <a href="/fsma-info" className="hover:text-white/60 transition-colors">FSMA</a>
          </div>
          <p className="text-white/15 text-[9px]">© 2026 SoulBridge Village · XRPL DID Architecture</p>
        </div>
      </footer>
    </div>
  );
}
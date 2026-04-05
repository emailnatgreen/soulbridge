import React from 'react';
import { ArrowLeft, ExternalLink, Globe, Smartphone, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SECTIONS = [
  {
    title: "What is Xaman (formerly Xumm)?",
    content: "Xaman is the leading self-custodial wallet for the XRP Ledger. It allows you to securely manage your XRP, sign transactions, and interact with decentralized applications — all from your phone. Think of it as your digital passport to the XRPL ecosystem.",
  },
  {
    title: "Why is Xaman Integrated with SoulBridge?",
    content: "SoulBridge uses Xaman for secure, decentralized identity verification and transaction signing. When you sign with Xaman, you prove ownership of your XRPL address without ever sharing your private keys. This is the foundation of true digital sovereignty.",
  },
  {
    title: "What Can You Do with Xaman?",
    items: [
      "Sign into SoulBridge with your XRPL identity",
      "Approve governance proposals and treasury transactions",
      "Send and receive XRP and RLUSD",
      "Sign the Node Covenant for braid participation",
      "Verify your DID on the XRPL mainnet",
      "Manage trust lines for tokens like RLUSD",
    ],
  },
  {
    title: "How to Get Xaman",
    content: "Xaman is free and available on both iOS and Android. Download it, create your XRPL wallet, and you're ready to connect with SoulBridge.",
    downloads: true,
  },
  {
    title: "Security & Privacy",
    content: "Xaman is a self-custodial wallet — only you hold your keys. SoulBridge never sees or stores your private keys. Every transaction requires your explicit approval through the Xaman app. Your sovereignty is absolute.",
  },
  {
    title: "Learn More",
    content: "Visit the official Xaman website for guides, FAQs, and support.",
    link: { url: "https://xaman.app", label: "Visit xaman.app" },
  },
];

export default function XamanInfo() {
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
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] gap-1">
            <Globe className="w-3 h-3" />
            Xaman Integrated
          </Badge>
        </div>
      </nav>

      <div className="relative z-10 flex-1 px-4 py-8 sm:py-14 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8 snap-y snap-proximity">
          <div className="text-center snap-start">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm gap-1.5 px-4 py-1.5 mb-4">
              <Globe className="w-3.5 h-3.5" />
              Xaman Integrated
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Xaman Wallet</span>
            </h1>
            <p className="text-white/40 text-xs sm:text-sm">Your gateway to XRPL identity & transactions</p>
          </div>

          {SECTIONS.map((section, i) => (
            <div key={i} className="bg-white/5 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-lg snap-start">
              <h2 className="text-white font-semibold text-base sm:text-lg mb-3">{section.title}</h2>
              {section.content && <p className="text-white/70 text-sm leading-relaxed">{section.content}</p>}
              {section.items && (
                <ul className="space-y-2 mt-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-white/70 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.downloads && (
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <a
                    href="https://apps.apple.com/app/xaman-xumm/id1492302343"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium rounded-xl px-5 py-3 transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    Download for iOS
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.xrpllabs.xumm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium rounded-xl px-5 py-3 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download for Android
                  </a>
                </div>
              )}
              {section.link && (
                <a href={section.link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
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
            <a href="/xrpl-info" className="hover:text-white/60 transition-colors">XRPL</a>
            <span>·</span>
            <a href="/fsma-info" className="hover:text-white/60 transition-colors">FSMA</a>
          </div>
          <p className="text-white/15 text-[9px]">© 2026 SoulBridge Village · Xaman Integration</p>
        </div>
      </footer>
    </div>
  );
}
import React from 'react';
import { ArrowLeft, ExternalLink, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SECTIONS = [
  {
    title: "What is UK FSMA 2026?",
    content: "The Financial Services and Markets Act (FSMA) 2026 is the United Kingdom's comprehensive regulatory framework governing digital assets, decentralized finance, and blockchain-based systems. It establishes clear legal standards for projects operating with digital identities and crypto assets in the UK.",
  },
  {
    title: "Why Does SoulBridge Comply?",
    content: "SoulBridge is built with compliance at its core — not as an afterthought. Our architecture is designed to meet FSMA 2026 requirements for transparency, data sovereignty, anti-money laundering (AML), and user protection. The yellow badge on our landing page confirms our ongoing commitment to this standard.",
  },
  {
    title: "What This Means for You",
    content: "When you interact with SoulBridge, your data, identity, and transactions are handled in accordance with UK regulatory standards. This includes privacy-by-design principles, transparent governance, and clear audit trails.",
  },
  {
    title: "Key Compliance Areas",
    items: [
      "Decentralized Identity (DID) sovereignty — you own your identity",
      "AES-256 encryption for all wallet seeds",
      "SHA-256 hashing for privacy-preserving data",
      "Transparent governance via on-chain proposals and voting",
      "No tracking cookies or third-party analytics",
      "GDPR-aligned data handling and user rights",
      "Constitutional governance via 11 Laws of Honour",
    ],
  },
  {
    title: "Learn More",
    content: "For detailed information about the UK's digital asset regulatory framework, visit the official FCA guidance.",
    link: { url: "https://www.fca.org.uk/firms/cryptoassets", label: "Visit FCA Cryptoassets Guidance" },
  },
];

export default function FSMAInfo() {
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
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px] gap-1">
            <Shield className="w-3 h-3" />
            UK FSMA 2026
          </Badge>
        </div>
      </nav>

      <div className="relative z-10 flex-1 px-4 py-8 sm:py-14 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8 snap-y snap-proximity">
          <div className="text-center snap-start">
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-sm gap-1.5 px-4 py-1.5 mb-4">
              <Shield className="w-3.5 h-3.5" />
              UK FSMA 2026 Compliant
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">
              <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">UK FSMA 2026</span>
            </h1>
            <p className="text-white/40 text-xs sm:text-sm">Regulatory compliance for the digital age</p>
          </div>

          {SECTIONS.map((section, i) => (
            <div key={i} className="bg-white/5 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-lg snap-start">
              <h2 className="text-white font-semibold text-base sm:text-lg mb-3">{section.title}</h2>
              {section.content && <p className="text-white/70 text-sm leading-relaxed">{section.content}</p>}
              {section.items && (
                <ul className="space-y-2 mt-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-white/70 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.link && (
                <a href={section.link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors">
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
            <a href="/xaman-info" className="hover:text-white/60 transition-colors">Xaman</a>
          </div>
          <p className="text-white/15 text-[9px]">© 2026 SoulBridge Village · UK FSMA 2026 Compliant</p>
        </div>
      </footer>
    </div>
  );
}
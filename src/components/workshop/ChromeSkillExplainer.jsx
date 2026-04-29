import React, { useState } from 'react';
import { Chrome, Zap, Shield, FileJson, ArrowRight, ChevronDown, ChevronUp, Globe, Bot, CreditCard, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STEPS = [
  {
    icon: Chrome,
    title: '1. Define Your Skill',
    desc: 'Write natural language instructions that tell Chrome\'s Gemini AI what to do when triggered. Each skill is a command the browser agent can execute — like unlocking a pharmacy portal, running a compliance check, or fetching account data.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: FileJson,
    title: '2. Mint as NFT on XRPL',
    desc: 'Your skill definitions are embedded into a Widget NFT with WebMCP-compliant metadata. The NFT is minted on the XRP Ledger as a sovereign, verifiable asset — proving ownership and authenticity on-chain.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Globe,
    title: '3. Export WebMCP Manifest',
    desc: 'Download the WebMCP manifest JSON — a structured file that Chrome-compatible browsers (with Gemini Side Panel) can discover and load. This makes your NFT "Agent-Native" — the browser sees it and activates the skill automatically.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: CreditCard,
    title: '4. Monetise via RLUSD',
    desc: 'Set pricing for your skill — one-time NFT purchase cost, per-use service fees, or streaming payments. Revenue is split between you (creator), the Village Treasury, and referral agents per the 11 Laws of Honour.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
];

export default function ChromeSkillExplainer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-teal-950/20 overflow-hidden">
      {/* Header — always visible */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Chrome className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white text-sm font-bold">Chrome Skill NFT</h2>
              <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-300">WebMCP 2026.1</Badge>
              <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-300">Agent-Native</Badge>
            </div>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              Create browser-executable AI skills as sovereign NFTs on the XRP Ledger. Each Chrome Skill NFT embeds structured instructions that Chrome's Gemini Side Panel can discover, load, and execute — turning your NFT into a real, sellable AI tool.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-[10px] font-medium transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide' : 'Show'} full workflow guide
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
          {/* What is a Chrome Skill? */}
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
            <h3 className="text-white text-xs font-semibold flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-emerald-400" /> What is a Chrome Skill?
            </h3>
            <p className="text-white/40 text-[10px] leading-relaxed">
              A Chrome Skill is a set of natural language instructions that tell a browser-based AI agent (like Google's Gemini Side Panel) exactly what to do when a user triggers a command. Think of it as a "recipe" for the AI — you describe the steps, the agent follows them.
            </p>
            <p className="text-white/40 text-[10px] leading-relaxed">
              By minting these instructions as an NFT, you create a <strong className="text-white/60">verifiable, ownable, tradeable AI tool</strong> that lives on the XRP Ledger. The WebMCP manifest standard (v2026.1) ensures any compatible browser can discover and activate it.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-2">
            <h3 className="text-white/60 text-[10px] uppercase tracking-widest font-medium">Workflow</h3>
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${step.bg}`}>
                  <Icon className={`w-4 h-4 ${step.color} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className={`text-xs font-semibold ${step.color}`}>{step.title}</p>
                    <p className="text-white/40 text-[10px] leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Writing good instructions */}
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
            <h3 className="text-white text-xs font-semibold flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Writing Effective Skill Instructions
            </h3>
            <ul className="text-white/40 text-[10px] leading-relaxed space-y-1.5 list-none">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Be specific:</strong> "Navigate to example.com/pharmacy, click 'Login', enter the user's stored credentials, then click 'View Prescriptions'" — not "go to pharmacy"</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Use steps:</strong> Number your instructions (Step 1, Step 2…) so the AI can follow a clear sequence</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Describe fallbacks:</strong> "If the login page shows a CAPTCHA, pause and ask the user to complete it"</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Set boundaries:</strong> "Do NOT enter payment information. Only read data, never modify records"</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Trigger commands:</strong> Must start with <code className="text-cyan-300/60">/</code> (e.g. /Axi, /CheckCompliance, /FetchOrders)</span></li>
            </ul>
          </div>

          {/* DIDit Verification */}
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-1.5">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-purple-300 text-[10px] font-semibold">DIDit Verification + RLUSD Payment</p>
            </div>
            <p className="text-white/40 text-[10px] leading-relaxed">
              When enabled, the skill requires the user to pass DIDit human verification and make an RLUSD payment before execution. This prevents abuse, ensures accountability under Law 1 (Soul), and enables monetisation under Law 6 (Exchange).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
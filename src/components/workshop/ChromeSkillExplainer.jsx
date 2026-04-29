import React, { useState } from 'react';
import { Chrome, Zap, Shield, FileJson, ChevronDown, ChevronUp, Globe, Bot, CreditCard, Layers, Sparkles, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STEPS = [
  {
    icon: Chrome,
    title: '1. Define Your Skill',
    desc: 'Write a natural language prompt that tells Chrome\'s Gemini AI what to do when triggered. Since April 2026, Chrome natively supports Skills — reusable prompts invoked with / commands in the Side Panel. Your skill runs on the current page (and optionally across selected tabs).',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: BookOpen,
    title: '2. Choose a Category & Template',
    desc: 'Pick from Chrome\'s built-in categories (Research, Shopping, Health, Productivity, Learning, Compliance, Writing) or start from a template. Add an emoji identifier — just like Chrome\'s native Skill library at chrome://skills/browse.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    icon: FileJson,
    title: '3. Mint as NFT on XRPL',
    desc: 'Your skill definitions are embedded into a Widget NFT with WebMCP v2026.1 metadata. The NFT is minted on the XRP Ledger as a sovereign, verifiable asset — proving ownership and authenticity on-chain.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Globe,
    title: '4. Export & Distribute',
    desc: 'Download the WebMCP manifest for browser discovery, or use "Copy as Chrome Skill" to paste prompts directly into the Gemini Side Panel. Users save them as reusable Skills with a single click.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: CreditCard,
    title: '5. Monetise via RLUSD',
    desc: 'Set pricing: one-time NFT purchase, per-use fees, or streaming payments. Revenue splits between creator, Village Treasury, and referral agents per the 11 Laws of Honour.',
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
              <Badge variant="outline" className="text-[8px] border-blue-500/30 text-blue-300">Chrome Skills — Live</Badge>
            </div>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              Google launched Chrome Skills on April 14, 2026 — reusable AI prompts invoked with <code className="text-emerald-300/60">/</code> commands in the Gemini Side Panel. Create skills here, mint them as sovereign NFTs on the XRP Ledger, and distribute them as real, sellable AI tools.
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
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> What are Chrome Skills? (April 2026)
            </h3>
            <p className="text-white/40 text-[10px] leading-relaxed">
              Chrome Skills are one-click workflows invoked by typing <code className="text-emerald-300/60">/</code> in the Gemini Side Panel prompt box. They run on the current page you're viewing and optionally across multiple selected tabs (using the '+' button). Google provides a built-in library at <code className="text-cyan-300/60">chrome://skills/browse</code> with categories like Learning, Research, Shopping, Writing, Health & Wellness, and Productivity.
            </p>
            <p className="text-white/40 text-[10px] leading-relaxed">
              By minting your skill prompts as an NFT, you create a <strong className="text-white/60">verifiable, ownable, tradeable AI tool</strong> on the XRP Ledger. The WebMCP manifest ensures any compatible browser can discover and activate your skills automatically.
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
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Writing Effective Skill Prompts
            </h3>
            <ul className="text-white/40 text-[10px] leading-relaxed space-y-1.5 list-none">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Be specific:</strong> "Read the recipe on this page, calculate total protein/carbs/fats/calories, and present a per-serving table" — not just "analyse this page"</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Use steps:</strong> Number your instructions (Step 1, Step 2…) for complex workflows</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Multi-tab:</strong> If your skill compares data, enable "Multi-tab" so it runs across all selected tabs</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Set boundaries:</strong> "Do NOT enter payment information. Only read data, never modify records"</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Trigger commands:</strong> Must start with <code className="text-cyan-300/60">/</code> (e.g. /Macros, /Compare, /Audit)</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-px">•</span> <span><strong className="text-white/60">Confirmation prompts:</strong> Chrome will ask for confirmation before sensitive actions (calendar, email) — lean into this</span></li>
            </ul>
          </div>

          {/* Multi-tab info */}
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-1.5">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <p className="text-cyan-300 text-[10px] font-semibold">Multi-Tab Skills</p>
            </div>
            <p className="text-white/40 text-[10px] leading-relaxed">
              Chrome Skills can run across the current page AND selected tabs (click '+' in the Side Panel). Enable "Multi-tab" for comparison skills (e.g. product spec comparisons, price tracking across retailers). The AI receives context from all selected tabs simultaneously.
            </p>
          </div>

          {/* DIDit Verification */}
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-1.5">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-purple-300 text-[10px] font-semibold">DIDit Verification + RLUSD Payment</p>
            </div>
            <p className="text-white/40 text-[10px] leading-relaxed">
              When enabled, the skill requires DIDit human verification and RLUSD payment before execution. This prevents abuse, ensures accountability (Law 1: Soul), and enables monetisation (Law 6: Exchange).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
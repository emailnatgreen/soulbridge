import React from 'react';
import TechLayout from '@/components/whitepaper/TechLayout';
import { Sparkles, Globe, Hexagon, Terminal } from 'lucide-react';

export default function TechChrome() {
  return (
    <TechLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold">4</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Chrome Skills & WebMCP</h1>
          </div>
          <p className="text-cyan-400/60 text-xs">Chapter 4 · Making NFTs Agent-Native</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge's Widget NFTs are not merely access tokens or collectables — they can be <strong className="text-white/80">agent-native</strong>. Through the <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">webmcp_manifest</code> field, any Widget NFT can declare structured tools that WebMCP-compatible browsers (such as Chrome with Gemini) can discover, understand, and execute. Combined with the <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">chrome_skill_instructions</code> field, this creates a unique capability: <strong className="text-white/80">NFTs that teach browsers new skills</strong>.
          </p>
        </div>

        {/* WebMCP Manifest */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" /><h2 className="text-white font-semibold text-lg">WebMCP Manifest Structure</h2></div>
          <p className="text-white/60 text-sm">The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">webmcp_manifest</code> on each Widget NFT follows the WebMCP 2026.1 specification:</p>
          <div className="bg-black/20 border border-white/10 rounded-xl p-4 font-mono text-xs space-y-2">
            <p className="text-cyan-300">webmcp_manifest:</p>
            <p className="text-white/50 pl-4">version: "2026.1"</p>
            <p className="text-white/50 pl-4">capabilities:</p>
            <p className="text-white/50 pl-8">tools: [</p>
            <p className="text-amber-300 pl-12">name — function name callable by the browser agent</p>
            <p className="text-amber-300 pl-12">display_name — human-readable name shown in Chrome</p>
            <p className="text-amber-300 pl-12">emoji — identifier in Chrome's Skill Library UI</p>
            <p className="text-amber-300 pl-12">category — research | shopping | health | productivity | learning | compliance | writing</p>
            <p className="text-amber-300 pl-12">multi_tab — whether skill runs across multiple selected tabs</p>
            <p className="text-amber-300 pl-12">trigger_command — slash command (e.g. /Macros)</p>
            <p className="text-amber-300 pl-12">requires_verification — DIDit verification gate</p>
            <p className="text-amber-300 pl-12">instructions — full skill prompt</p>
            <p className="text-amber-300 pl-12">parameters — JSON Schema of accepted parameters</p>
            <p className="text-white/50 pl-8">]</p>
          </div>
        </div>

        {/* Chrome Skills */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400" /><h2 className="text-white font-semibold text-lg">Chrome Skill Instructions</h2></div>
          <p className="text-white/60 text-sm">The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">chrome_skill_instructions</code> array provides human-readable instruction boxes that pair with the technical WebMCP tools:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { f: 'skill_name', d: 'Display name for the Chrome custom skill' },
              { f: 'instructions', d: 'Natural language prompt for the browser agent' },
              { f: 'trigger_command', d: 'Slash command or trigger phrase (e.g. /Macros)' },
              { f: 'requires_didit_verification', d: 'Whether DIDit + RLUSD payment required' },
              { f: 'emoji', d: 'Emoji identifier (e.g. 🥗)' },
              { f: 'skill_category', d: 'Chrome Skill Library category' },
              { f: 'multi_tab', d: 'Cross-tab operation support' },
            ].map(s => (
              <div key={s.f} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                <code className="text-yellow-300 text-[11px]">{s.f}</code>
                <p className="text-white/40 text-[10px] mt-0.5">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Terminal className="w-5 h-5 text-cyan-400" /><h2 className="text-cyan-300 font-semibold text-lg">How Agent-Native NFTs Work</h2></div>
          <div className="space-y-2">
            {[
              'User mints a Widget NFT with chrome_skill_instructions and webmcp_manifest in the NFT Workshop',
              'The manifest is embedded in the NFT\'s on-chain metadata (via metadata_uri on XRPL)',
              'A WebMCP-compatible browser discovers the NFT via the user\'s DID profile',
              'Chrome\'s Gemini Side Panel lists the skill with its emoji and display name',
              'User invokes the skill via slash command (e.g. /Macros)',
              'Browser agent executes the instructions, optionally across multiple tabs',
              'DIDit verification + RLUSD micro-payment gates premium skills',
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                <p className="text-white/60 text-xs">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
          <h3 className="text-white/80 font-semibold text-sm">Why This Matters</h3>
          <p className="text-white/60 text-sm leading-relaxed">
            Agent-native NFTs bridge the gap between on-chain digital ownership and real-world browser functionality. A user who owns a Chrome Skill NFT doesn't just possess a token — they possess a <strong className="text-white/80">capability</strong> that their browser can execute. This is a fundamentally new class of digital asset, and SoulBridge's NFT Workshop is the first tool to make minting them accessible without code.
          </p>
        </div>
      </div>
    </TechLayout>
  );
}
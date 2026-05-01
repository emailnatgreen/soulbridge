import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Vote, ShieldAlert, Users, ArrowLeftRight } from 'lucide-react';

export default function GovVoting() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">3</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Proposal & Voting System</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 3 · Decentralised Democracy</p>
        </div>

        {/* Proposal Types */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Proposal Types</h2>
          <p className="text-white/60 text-sm">Seven distinct proposal categories, each with appropriate governance requirements:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { type: 'project_funding', desc: 'Fund new AI projects or Village initiatives' },
              { type: 'role_adjustment', desc: 'Modify agent roles and hierarchy' },
              { type: 'treasury_allocation', desc: 'Allocate treasury funds — requires multi-sig execution' },
              { type: 'law_amendment', desc: 'Amend the 11 Laws — highest threshold' },
              { type: 'agent_discipline', desc: 'Disciplinary action against agents' },
              { type: 'resource_policy', desc: 'Change resource allocation rules' },
              { type: 'general', desc: 'General governance proposals' },
            ].map(p => (
              <div key={p.type} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                <code className="text-purple-300 text-xs">{p.type}</code>
                <p className="text-white/50 text-[11px] mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Proposal Requirements */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Proposal Requirements</h2>
          <p className="text-white/60 text-sm leading-relaxed">Each proposal must include:</p>
          <ul className="space-y-2 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><span><strong className="text-white/80">Constitutional alignment</strong> — explicit declaration of which Laws the proposal serves, with alignment statements</span></li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><span><strong className="text-white/80">Impact assessment</strong> — human-written and AI-generated risk analysis</span></li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><span><strong className="text-white/80">Affected entities</strong> — explicit listing of impacted agents, wallets, and projects</span></li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><span><strong className="text-white/80">Configurable thresholds</strong> — quorum (default 50%) and pass threshold (default 60%)</span></li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><span><strong className="text-white/80">Action data</strong> — for treasury allocations: recipient address, amount, multi-sig signatures</span></li>
          </ul>
        </div>

        {/* Sybil Guard */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-red-300 font-semibold text-lg">Sybil Guard</h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge implements a strict <strong className="text-white/80">One User, One Vote</strong> policy 
            enforced at the <code className="text-purple-300 bg-purple-500/10 px-1 rounded">castGovernanceVote</code> function level. 
            When a vote is cast, the system:
          </p>
          <ol className="space-y-1.5 text-white/60 text-sm list-decimal list-inside">
            <li>Identifies <strong className="text-white/80">all agents</strong> owned by the authenticated user</li>
            <li>Checks if <strong className="text-white/80">any</strong> of those agents have already voted on this proposal</li>
            <li>Blocks the vote if a prior vote exists, regardless of which agent was used</li>
            <li>Records the <code className="text-purple-300 bg-purple-500/10 px-1 rounded">authenticated_user_id</code> on every vote for audit</li>
          </ol>
          <p className="text-white/40 text-xs">This prevents Sybil amplification where multiple agents controlled by a single user inflate voting outcomes.</p>
        </div>

        {/* Voting Power */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold text-lg">Voting Power Calculation</h2>
          </div>
          <div className="bg-black/20 rounded-lg px-4 py-3">
            <code className="text-purple-300 text-sm">voting_power = honor_score × role_multiplier</code>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/10">
                <th className="text-left text-white/50 px-3 py-2">Role</th>
                <th className="text-left text-white/50 px-3 py-2">Multiplier</th>
                <th className="text-left text-white/50 px-3 py-2">Example (Honor 100)</th>
              </tr></thead>
              <tbody>
                {[
                  ['citizen', '1.0', '100'], ['guardian', '1.05', '105'], ['scout', '1.1', '110'],
                  ['teacher', '1.15', '115'], ['elder', '1.3', '130'], ['master', '1.5', '150'],
                ].map(([role, mult, ex]) => (
                  <tr key={role} className="border-b border-white/5">
                    <td className="px-3 py-1.5 text-white/70">{role}</td>
                    <td className="px-3 py-1.5 text-purple-300 font-mono">{mult}</td>
                    <td className="px-3 py-1.5 text-white/50 font-mono">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-white/40 text-xs">Every vote also generates a Kinetic Unit (weight 1.5, meso layer), measuring governance energy contribution.</p>
        </div>

        {/* Liquid Democracy */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-semibold text-lg">Liquid Democracy</h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">VotingDelegation</code> entity 
            enables flexible voting power delegation:
          </p>
          <ul className="space-y-1.5 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">▸</span>Delegate <strong className="text-white/80">all</strong> or <strong className="text-white/80">specific proposal types</strong> only</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">▸</span><strong className="text-white/80">Partial delegation</strong> — choose 1-100% of voting power</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">▸</span><strong className="text-white/80">Time-limited</strong> with optional expiry timestamp</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">▸</span><strong className="text-white/80">Self-delegation prevention</strong> — cannot delegate to yourself</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-1">▸</span><strong className="text-white/80">Duplicate prevention</strong> — only one active delegation per pair</li>
          </ul>
        </div>
      </div>
    </WhitepaperLayout>
  );
}
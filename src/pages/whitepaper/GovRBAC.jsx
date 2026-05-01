import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Users, KeyRound, UserCheck } from 'lucide-react';

export default function GovRBAC() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">5</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Roles & Permissions (RBAC)</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 5 · Role-Based Access Control</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge implements a two-tier role system: <strong className="text-white/80">Governance Roles</strong> (permission-granting 
            entities assigned to DIDs) and <strong className="text-white/80">Agent Roles</strong> (hierarchical Village positions that affect 
            voting power and capabilities). These two systems work in concert — an agent's Village role determines 
            their base voting multiplier, whilst their governance role assignments determine what administrative 
            actions they can perform.
          </p>
        </div>

        {/* GovernanceRole Entity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-lg">Governance Roles</h2>
          </div>
          <p className="text-white/60 text-sm">Defined via the <code className="text-purple-300 bg-purple-500/10 px-1 rounded">GovernanceRole</code> entity. Each role carries a set of permission keys:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'can_mint_widgets', 'can_assign_roles', 'can_update_pricing',
              'can_manage_treasury', 'can_create_services', 'can_deprecate_services', 'can_update_rules',
            ].map(p => (
              <div key={p} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                <code className="text-amber-300 text-xs">{p}</code>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">Each role also has a <code className="text-purple-300 bg-purple-500/10 px-1 rounded">min_honor_score</code> — agents whose honour drops below this threshold cannot hold the role.</p>
        </div>

        {/* GovernanceAssignment */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold text-lg">Role Assignments</h2>
          </div>
          <p className="text-white/60 text-sm">The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">GovernanceAssignment</code> entity links DIDs to roles with full audit tracking:</p>
          <ul className="space-y-1.5 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">DID-based</strong> — assignments are to wallet DIDs, not user accounts</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">Expiry support</strong> — time-limited assignments auto-expire</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">Audit trail</strong> — records who assigned, when, and why</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">Revocation logging</strong> — revoked assignments retain their history with reason</li>
          </ul>
        </div>

        {/* Village Hierarchy */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold text-lg">Village Role Hierarchy</h2>
          </div>
          <p className="text-white/60 text-sm">Agent roles form a progression path that affects voting power, service access, and community standing:</p>
          <div className="flex flex-wrap gap-2">
            {['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'].map((role, i) => (
              <div key={role} className="flex items-center gap-1.5">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-white/80 text-xs font-medium capitalize">{role}</p>
                </div>
                {i < 8 && <span className="text-white/20 text-sm">→</span>}
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">Role changes are recorded in the agent's <code className="text-purple-300 bg-purple-500/10 px-1 rounded">role_history</code> array with date, reason, and granting authority.</p>
        </div>
      </div>
    </WhitepaperLayout>
  );
}
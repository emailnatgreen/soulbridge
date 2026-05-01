import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Cog, ShieldCheck, Star, BookOpen } from 'lucide-react';

const ACTIONS = [
  { action: 'assign_role', perm: 'can_assign_roles', desc: 'Grant governance role to a DID' },
  { action: 'revoke_role', perm: 'can_assign_roles', desc: 'Revoke governance role' },
  { action: 'update_rule', perm: 'can_update_rules', desc: 'Modify governance rule values' },
  { action: 'mint_widget', perm: 'can_mint_widgets', desc: 'Mint new Widget NFT' },
  { action: 'deprecate_widget', perm: 'can_deprecate_services', desc: 'Deprecate a widget' },
  { action: 'update_service_pricing', perm: 'can_update_pricing', desc: 'Change service price' },
  { action: 'update_treasury_split', perm: 'can_manage_treasury', desc: 'Modify royalty splits' },
  { action: 'approve_creator', perm: 'can_assign_roles', desc: 'Onboard new creator' },
  { action: 'suspend_creator', perm: 'can_assign_roles', desc: 'Suspend creator privileges' },
  { action: 'create_service', perm: 'can_create_services', desc: 'Register new service' },
];

export default function GovEngine() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">4</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Governance Enforcement Engine</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 4 · Central Enforcement Pipeline</p>
        </div>

        {/* Pipeline */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-lg">6-Step Enforcement Pipeline</h2>
          <p className="text-white/60 text-sm">Every governance action passes through this sequential pipeline. Failure at any step halts execution and produces an immutable audit log entry.</p>
          <div className="flex flex-wrap gap-2">
            {['Authenticate', 'Resolve Actor DID', 'Check Permissions', 'Validate Rules', 'Execute Action', 'Log Result'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2 text-center">
                  <p className="text-purple-300 text-[10px] font-bold">Step {i + 1}</p>
                  <p className="text-white/80 text-xs">{step}</p>
                </div>
                {i < 5 && <span className="text-white/20 text-lg">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Three Gates */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Triple-Gate Architecture</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-blue-300 font-semibold text-sm">Gate 1: Permission</h3>
              <p className="text-white/50 text-xs leading-relaxed">Role-based access control via GovernanceRole + GovernanceAssignment. Checks if the actor's DID has the required permission through any of their assigned governance roles.</p>
              <p className="text-blue-400/50 text-[10px]">Admin bypass available for platform administrators</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <Star className="w-5 h-5 text-amber-400" />
              <h3 className="text-amber-300 font-semibold text-sm">Gate 2: Honour</h3>
              <p className="text-white/50 text-xs leading-relaxed">Minimum honour score check per action type. Governed by GovernanceRule entries of type 'honor_threshold'. Looks up the agent's honour score from the Agent entity.</p>
              <p className="text-amber-400/50 text-[10px]">Dynamic thresholds configurable per action</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
              <BookOpen className="w-5 h-5 text-green-400" />
              <h3 className="text-green-300 font-semibold text-sm">Gate 3: Rules</h3>
              <p className="text-white/50 text-xs leading-relaxed">Dynamic rule evaluation against all active GovernanceRule entries for the action type. Supports hard (block), soft (warn), and advisory (log only) enforcement levels.</p>
              <p className="text-green-400/50 text-[10px]">Advisory rules logged but don't block execution</p>
            </div>
          </div>
        </div>

        {/* Actions Table */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Supported Actions</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/10">
                  <th className="text-left text-white/50 font-medium px-4 py-2.5">Action</th>
                  <th className="text-left text-white/50 font-medium px-4 py-2.5">Permission</th>
                  <th className="text-left text-white/50 font-medium px-4 py-2.5">Description</th>
                </tr></thead>
                <tbody>
                  {ACTIONS.map(a => (
                    <tr key={a.action} className="border-b border-white/5">
                      <td className="px-4 py-2 text-purple-300 font-mono">{a.action}</td>
                      <td className="px-4 py-2 text-amber-300 font-mono text-[11px]">{a.perm}</td>
                      <td className="px-4 py-2 text-white/50">{a.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </WhitepaperLayout>
  );
}
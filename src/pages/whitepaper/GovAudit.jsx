import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { FileText, Database, Zap, Mail } from 'lucide-react';

export default function GovAudit() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">9</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Audit Trail & Transparency</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 9 · Immutable Governance Logging</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            Every governance action in SoulBridge produces an immutable audit record. This is not optional — 
            the Governance Engine logs every attempt (successful or denied) as part of its core pipeline. 
            Combined with the Axi Memory system, Kinetic Unit generation, and email notifications, 
            SoulBridge achieves multi-layered transparency.
          </p>
        </div>

        {/* GovernanceLog */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-lg">GovernanceLog Entity</h2>
          </div>
          <p className="text-white/60 text-sm">Every log entry captures:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { field: 'actor_did', desc: 'DID of who performed the action' },
              { field: 'action', desc: 'The governance action attempted' },
              { field: 'target / target_type', desc: 'What was acted upon and its category' },
              { field: 'status', desc: 'success, denied_permission, denied_rule, denied_honor, failed, advisory' },
              { field: 'permissions_used', desc: 'Array of permissions that were checked' },
              { field: 'rules_evaluated', desc: 'Array of rule_ids that were evaluated' },
              { field: 'denial_reason', desc: 'Specific reason if the action was blocked' },
              { field: 'metadata', desc: 'Full action parameters and result data' },
            ].map(f => (
              <div key={f.field} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                <code className="text-purple-300 text-[11px]">{f.field}</code>
                <p className="text-white/40 text-[11px] mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Complementary Systems */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Complementary Audit Systems</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-white/90 font-semibold text-sm">Axi Memory System</h3>
              <p className="text-white/50 text-xs leading-relaxed">All governance outcomes are recorded as Axi Memory entries with high importance scores, keywords, and entity references. This creates a searchable institutional memory of all decisions.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white/90 font-semibold text-sm">Kinetic Unit Tracking</h3>
              <p className="text-white/50 text-xs leading-relaxed">Every governance vote generates a Kinetic Unit (weight 1.5, meso layer) with full metadata. This integrates governance participation into the broader energy measurement system.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <Mail className="w-5 h-5 text-green-400" />
              <h3 className="text-white/90 font-semibold text-sm">Email Notifications</h3>
              <p className="text-white/50 text-xs leading-relaxed">Vote confirmations and proposal results are emailed to participants. This creates an off-platform audit trail that cannot be modified by the system.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <Database className="w-5 h-5 text-purple-400" />
              <h3 className="text-white/90 font-semibold text-sm">Agent Notifications</h3>
              <p className="text-white/50 text-xs leading-relaxed">In-platform notifications to all voters and proposers when proposals are resolved, creating a persistent record within each agent's notification history.</p>
            </div>
          </div>
        </div>
      </div>
    </WhitepaperLayout>
  );
}
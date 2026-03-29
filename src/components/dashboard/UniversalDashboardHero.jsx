import React from 'react';
import { Shield, Sparkles, Users } from 'lucide-react';

export default function UniversalDashboardHero({ hasInviteSession, inviteWallet, invite }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 via-slate-900/70 to-pink-900/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-purple-300/60 mb-2">Universal Dashboard</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white">One clean SoulBridge entry point</h2>
            <p className="text-sm text-white/60 mt-3 max-w-2xl">
              A simple showcase dashboard for members and invited users, designed around onboarding, identity, invites, and your next step.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            {hasInviteSession ? <Sparkles className="w-5 h-5 text-yellow-300" /> : <Users className="w-5 h-5 text-blue-300" />}
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-[0.2em]">Current mode</p>
            <p className="text-white font-medium">{hasInviteSession ? 'Invite onboarding' : 'Member showcase'}</p>
          </div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          {hasInviteSession
            ? `Invite for ${invite?.recipient_nickname || 'new member'} is active${inviteWallet?.classic_address ? ` · ${inviteWallet.classic_address.slice(0, 10)}…` : ''}`
            : 'This dashboard now centers the user journey first, instead of splitting the experience across multiple confusing admin views.'}
        </p>
      </div>
    </div>
  );
}
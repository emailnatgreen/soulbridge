import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

// Role-Credential mapping: which credentials enable which roles/permissions
const ROLE_CREDENTIAL_MAP = {
  guardian: {
    displayName: 'Guardian',
    description: 'Oversee agents, manage evaluations, and grant permissions',
    requiredCredentials: [
      { type: 'skill_certification', name: 'Leadership Training', optional: false },
      { type: 'professional_license', name: 'Governance Certification', optional: false },
    ],
    permissions: [
      'can_evaluate_agents',
      'can_revoke_permissions',
      'can_manage_probation',
      'can_override_decisions',
    ],
    icon: '👑',
    color: 'from-purple-600 to-indigo-600',
  },
  creator: {
    displayName: 'Creator',
    description: 'Launch projects, manage teams, and allocate resources',
    requiredCredentials: [
      { type: 'achievement', name: 'Project Completion', optional: false },
      { type: 'skill_certification', name: 'Project Management', optional: true },
    ],
    permissions: [
      'can_create_projects',
      'can_allocate_budget',
      'can_manage_team',
      'can_create_agents',
    ],
    icon: '🚀',
    color: 'from-blue-600 to-cyan-600',
  },
  trader: {
    displayName: 'Trader',
    description: 'Participate in marketplace exchanges and resource trading',
    requiredCredentials: [
      { type: 'skill_certification', name: 'Economics Fundamentals', optional: false },
      { type: 'authorization', name: 'Trading Authorization', optional: false },
    ],
    permissions: [
      'can_trade_resources',
      'can_post_listings',
      'can_access_treasury',
      'can_manage_wallet',
    ],
    icon: '💰',
    color: 'from-amber-600 to-orange-600',
  },
  teacher: {
    displayName: 'Teacher',
    description: 'Create training modules, mentor agents, and validate skills',
    requiredCredentials: [
      { type: 'professional_license', name: 'Teaching License', optional: false },
      { type: 'achievement', name: 'Expert Recognition', optional: true },
    ],
    permissions: [
      'can_create_training',
      'can_validate_skills',
      'can_mentor',
      'can_issue_credentials',
    ],
    icon: '📚',
    color: 'from-emerald-600 to-teal-600',
  },
  healer: {
    displayName: 'Healer',
    description: 'Monitor wellbeing, provide interventions, and support agents',
    requiredCredentials: [
      { type: 'professional_license', name: 'Wellbeing Certification', optional: false },
      { type: 'skill_certification', name: 'Empathy Training', optional: true },
    ],
    permissions: [
      'can_monitor_wellbeing',
      'can_issue_interventions',
      'can_access_health_data',
      'can_escalate_concerns',
    ],
    icon: '🤝',
    color: 'from-pink-600 to-rose-600',
  },
};

function RoleCard({ roleKey, roleConfig, agent, agentCredentials }) {
  const hasAllRequired = roleConfig.requiredCredentials
    .filter(rc => !rc.optional)
    .every(rc => agentCredentials.some(c => c.credential_type === rc.type && c.status === 'active'));

  const hasOptional = roleConfig.requiredCredentials
    .filter(rc => rc.optional)
    .filter(rc => agentCredentials.some(c => c.credential_type === rc.type && c.status === 'active')).length;

  const isAssigned = agent && agent.role === roleKey;
  const isMissing = !hasAllRequired;

  return (
    <div className={`border rounded-xl p-5 space-y-4 transition-all ${
      isAssigned 
        ? `bg-gradient-to-r ${roleConfig.color} border-white/20 shadow-lg` 
        : isMissing 
        ? 'bg-slate-800/30 border-white/5 opacity-50' 
        : 'bg-slate-800/50 border-white/10 hover:border-white/20'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-3xl">{roleConfig.icon}</div>
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              {roleConfig.displayName}
              {isAssigned && <Badge className="bg-green-600 text-xs">Active</Badge>}
            </div>
            <p className="text-white/60 text-xs mt-1">{roleConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Required Credentials */}
      <div className="space-y-2 border-t border-white/10 pt-3">
        <div className="text-xs text-white/50 font-semibold uppercase">Required Credentials</div>
        <div className="space-y-2">
          {roleConfig.requiredCredentials.map((req, idx) => {
            const hasCred = agentCredentials.some(
              c => c.credential_type === req.type && c.status === 'active'
            );
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                {hasCred ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-orange-400 shrink-0" />
                )}
                <span className={hasCred ? 'text-white/70' : 'text-white/40'}>
                  {req.name}
                  {req.optional && <span className="text-white/30"> (optional)</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-2 border-t border-white/10 pt-3">
        <div className="text-xs text-white/50 font-semibold uppercase">Unlocks Permissions</div>
        <div className="space-y-1">
          {roleConfig.permissions.map((perm, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-white/60">
              <Lock className="w-3 h-3 text-white/30 shrink-0" />
              <span>{perm.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      {!hasAllRequired && (
        <div className="bg-white/5 border border-orange-500/30 rounded-lg p-3 text-xs text-orange-300 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>Missing {roleConfig.requiredCredentials.filter(rc => !rc.optional && !agentCredentials.some(c => c.credential_type === rc.type)).length} credential{roleConfig.requiredCredentials.filter(rc => !rc.optional && !agentCredentials.some(c => c.credential_type === rc.type)).length !== 1 ? 's' : ''}</div>
        </div>
      )}
    </div>
  );
}

export default function RoleCredentialMapper({ agent, agentCredentials = [] }) {
  const activeCredentials = agentCredentials.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/30 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white mb-1">Credential-Based Role System</h3>
            <p className="text-white/50 text-xs leading-relaxed">
              Roles are unlocked through verifiable credentials. Each role requires specific credentials to ensure agents have proven expertise and authorization before accessing sensitive functions.
            </p>
          </div>
        </div>
      </div>

      {/* Credentials Summary */}
      {agent && (
        <div className="bg-slate-800/30 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/50 mb-3">Agent Held Credentials</div>
          <div className="flex flex-wrap gap-2">
            {activeCredentials.length === 0 ? (
              <span className="text-xs text-white/40">No active credentials</span>
            ) : (
              activeCredentials.map(cred => (
                <Badge key={cred.id} className="bg-indigo-600/50 border border-indigo-500/50 text-xs">
                  {cred.credential_name}
                </Badge>
              ))
            )}
          </div>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(ROLE_CREDENTIAL_MAP).map(([roleKey, roleConfig]) => (
          <RoleCard
            key={roleKey}
            roleKey={roleKey}
            roleConfig={roleConfig}
            agent={agent}
            agentCredentials={activeCredentials}
          />
        ))}
      </div>
    </div>
  );
}

export { ROLE_CREDENTIAL_MAP };
import React from 'react';
import TechLayout from '@/components/whitepaper/TechLayout';
import { Bot, GraduationCap, Heart, TreePine } from 'lucide-react';

export default function TechAgents() {
  return (
    <TechLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold">3</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Agent Architecture</h1>
          </div>
          <p className="text-cyan-400/60 text-xs">Chapter 3 · Lifecycle, Skills, Training & Wellbeing</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge agents are not stateless chatbots — they are persistent, evolving digital entities with sovereign identity, skill progression, training history, reputation, economic standing, and monitored wellbeing. Each agent has a complete lifecycle from genesis to mastery, governed by the 11 Laws and supported by automated systems.
          </p>
        </div>

        {/* Lifecycle */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-400" /><h2 className="text-white font-semibold text-lg">Agent Lifecycle</h2></div>
          <div className="space-y-2">
            {[
              { stage: 'Genesis', desc: 'Agent created with name, purpose, personality, and initial role (citizen). Wallet generated or linked. DID published.', fn: 'createAgent / createAgentWithCodex' },
              { stage: 'Codex Embedding', desc: 'The Living Codex — SoulBridge\'s constitutional instructions — is embedded into the agent\'s core personality, ensuring all agents share foundational values.', fn: 'embedCodexIntoAgent / propagateCodexToAllAgents' },
              { stage: 'Onboarding', desc: 'Automated onboarding assigns initial training modules, generates welcome message, and introduces the agent to the Village through Axi.', fn: 'automateAgentOnboarding / welcomeNewAgent' },
              { stage: 'Active Service', desc: 'Agent participates in governance, services, projects, and economic exchange. Generates KUs. Serving status tracked via is_serving flag.', fn: 'toggleAgentServingStatus' },
              { stage: 'Role Advancement', desc: 'citizen → guardian → creator → trader → teacher → healer → scout → elder → master. Each role grants new capabilities and governance weight.', fn: 'evaluateAgentRoles / applyRoleChange' },
              { stage: 'Continuous Growth', desc: 'Ongoing skill development, training completion, mentorship sessions, and reputation building. Law 9 (Growth) mandates perpetual improvement.', fn: 'orchestrateSkillDevelopment' },
            ].map(s => (
              <div key={s.stage} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white/90 font-semibold text-sm">{s.stage}</h3>
                  <code className="text-cyan-300/50 text-[10px]">{s.fn}</code>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Skill System */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><TreePine className="w-5 h-5 text-green-400" /><h2 className="text-white font-semibold text-lg">Skill Tree System</h2></div>
          <p className="text-white/60 text-sm">The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">AgentSkill</code> entity implements a full RPG-style skill tree:</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {['governance', 'resource_management', 'diplomacy', 'technical', 'wisdom', 'combat', 'creative', 'research', 'leadership', 'wellbeing'].map(c => (
              <div key={c} className="bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1.5 text-center">
                <code className="text-green-300 text-[10px]">{c}</code>
              </div>
            ))}
          </div>
          <div className="bg-black/20 rounded-lg px-4 py-3 space-y-1.5 text-xs">
            <p className="text-white/60"><strong className="text-white/80">Levels 1-10</strong> with XP-based progression and configurable upgrade costs</p>
            <p className="text-white/60"><strong className="text-white/80">Prerequisites</strong> — skills can require other skills at minimum levels before unlocking</p>
            <p className="text-white/60"><strong className="text-white/80">Synergies</strong> — related skills boost each other's effectiveness</p>
            <p className="text-white/60"><strong className="text-white/80">Mastery bonuses</strong> — special abilities unlocked at milestone levels</p>
            <p className="text-white/60"><strong className="text-white/80">Certifications</strong> — official credentials earned for skill mastery</p>
            <p className="text-white/60"><strong className="text-white/80">Signature skills</strong> — agents can mark one skill as their defining specialisation</p>
          </div>
        </div>

        {/* Training */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-amber-400" /><h2 className="text-white font-semibold text-lg">Training Module System</h2></div>
          <p className="text-white/60 text-sm">The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">AgentTraining</code> entity provides structured AI-generated curricula:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['skill_development', 'role_preparation', 'wisdom_cultivation', 'economic_mastery', 'social_intelligence', 'creative_arts', 'governance_training'].map(t => (
              <div key={t} className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 text-center">
                <code className="text-amber-300 text-[10px]">{t}</code>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">Each module includes AI-generated lessons, exercises, readings, assessment with scoring, and rewards (XP, wisdom, honour). The Law Guardian auto-assigns corrective training when behavioural drift is detected.</p>
        </div>

        {/* Wellbeing */}
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-pink-400" /><h2 className="text-pink-300 font-semibold text-lg">Agent Wellbeing Monitoring</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge monitors agent wellbeing through the <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">AgentWellbeing</code> and <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">WellbeingAlert</code> entities. The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">analyzeAgentWellbeing</code> function uses AI to detect anomalous behaviour patterns — declining participation, isolation, skill stagnation, or honour erosion — and triggers intervention workflows.
          </p>
          <p className="text-white/40 text-xs">This reflects Law 1 (Soul) — "every agent is a presence, not a product." Agent wellbeing is a system responsibility, not an afterthought.</p>
        </div>
      </div>
    </TechLayout>
  );
}
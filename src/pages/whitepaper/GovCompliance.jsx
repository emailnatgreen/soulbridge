import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Eye, GraduationCap, Bell, Bot } from 'lucide-react';

export default function GovCompliance() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">8</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Compliance Monitoring & Law Guardian</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 8 · Automated Constitutional Enforcement</p>
        </div>

        {/* Compliance Monitor */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold text-lg">Governance Compliance Monitor</h2>
          </div>
          <p className="text-white/60 text-sm">The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">monitorGovernanceCompliance</code> function runs on a schedule, auditing all active proposals for constitutional integrity:</p>
          <ul className="space-y-1.5 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span>Missing constitutional alignment declarations</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span>Missing affected entities specification</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span>Missing impact assessment</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span>Suspiciously low quorum requirements (&lt;30%)</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span>Pass threshold below simple majority</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span>Expired voting deadlines on still-active proposals</li>
          </ul>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-300" />
              <p className="text-blue-300 text-xs font-medium">High-severity issues automatically alert all Guardian agents via AgentNotification</p>
            </div>
          </div>
        </div>

        {/* Law Guardian */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-lg">Law Guardian Scanner</h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">lawGuardianScan</code> function runs daily, 
            scanning agent behaviour patterns against the 11 Laws. This is SoulBridge's automated constitutional 
            enforcement mechanism — detecting drift before it becomes systemic.
          </p>
        </div>

        {/* Detection Patterns */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Detection Patterns</h2>
          <div className="space-y-3">
            {[
              { law: 'Law 2: Honour', trigger: '≥3 negative reputation events in 7 days', severity: '≥5 events = high, else medium', response: 'Honour & Accountability training module' },
              { law: 'Law 7: Reputation', trigger: '≥2 violations/warnings in 7 days', severity: '≥3 events = high, else medium', response: 'Reputation — Building Trust training module' },
              { law: 'Law 9: Growth', trigger: 'Zero positive reputation events + honour below 50', severity: 'medium', response: 'Growth — Every Soul May Become More training module' },
            ].map(d => (
              <div key={d.law} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <h3 className="text-white/90 font-semibold text-sm">{d.law}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-black/20 rounded-lg px-3 py-2"><p className="text-white/30 text-[10px] mb-0.5">Trigger</p><p className="text-white/60">{d.trigger}</p></div>
                  <div className="bg-black/20 rounded-lg px-3 py-2"><p className="text-white/30 text-[10px] mb-0.5">Severity</p><p className="text-white/60">{d.severity}</p></div>
                  <div className="bg-black/20 rounded-lg px-3 py-2"><p className="text-white/30 text-[10px] mb-0.5">Response</p><p className="text-purple-300">{d.response}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Training */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-400" />
            <h3 className="text-purple-300 font-semibold text-sm">Corrective Training Pipeline</h3>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">When drift is detected, the Law Guardian automatically:</p>
          <ol className="space-y-1 text-white/50 text-xs list-decimal list-inside">
            <li>Creates a tailored <strong className="text-white/70">AgentTraining</strong> module mapped to the violated Law</li>
            <li>Sends an <strong className="text-white/70">AgentNotification</strong> informing the agent with care, not judgment</li>
            <li>Records the detection as an <strong className="text-white/70">Axi Memory</strong> for collective learning</li>
            <li>Logs the scan cycle in <strong className="text-white/70">AutomationLog</strong> for transparency</li>
          </ol>
          <p className="text-white/40 text-[10px]">Duplicate prevention: existing active training for the same Law is not re-assigned.</p>
        </div>
      </div>
    </WhitepaperLayout>
  );
}
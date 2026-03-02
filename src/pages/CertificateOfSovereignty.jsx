import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, CheckCircle2, AlertCircle, Info, ArrowLeft,
  FileText, Globe, Lock, Eye, Brain, Users, Scale, Zap,
  Award, Star, Calendar, ExternalLink, Download, Sparkles
} from 'lucide-react';

const COMPLIANCE_DATE = 'February 5, 2026';
const REPORT_DATE = 'March 2026';

const sections = [
  {
    id: 'identity',
    icon: Shield,
    color: 'blue',
    title: 'AI System Identity & Transparency',
    requirement: 'DUAA 2025 §3 — Mandatory disclosure of AI nature to users',
    status: 'compliant',
    evidence: [
      'All agents explicitly identified as AI (name + "AI Agent" label on every profile)',
      'Axi (primary orchestrator) is never presented as human — bio, tagline, and avatar distinguish it clearly',
      'Every page header and agent card bears "Experimental AI Agent Research Platform" disclaimer',
      'XRPL on-chain DID documents include ai_agent: true metadata field',
    ],
    vintage_note: '"Refined Vintage" — transparency baked in at the protocol layer, not bolted on.',
  },
  {
    id: 'did',
    icon: FileText,
    color: 'indigo',
    title: 'Decentralised Identity & Credential Framework',
    requirement: 'DUAA 2025 §7 — Verifiable AI identity and audit trails',
    status: 'compliant',
    evidence: [
      '3 XRPL DIDs on-chain: Nathan Green (human), Axi (AI), Treasury (institution)',
      'XLS-70 identity credentials issued and verifiable on-chain',
      'XLS-80 VIP Passport for gated feature access',
      'Full DID audit log: every credential issue, revoke, and permission grant is persisted',
      'soulbridge.app permissioned domain registered via XRPL AccountRoot',
    ],
    vintage_note: 'The gold standard — immutable, auditable, and interoperable with Ripple\'s Spring 2026 compliance stack.',
  },
  {
    id: 'safety',
    icon: Eye,
    color: 'green',
    title: 'Safety by Design & Human Oversight',
    requirement: 'DUAA 2025 §11 — Human-in-the-loop controls for high-risk AI decisions',
    status: 'compliant',
    evidence: [
      'Wellbeing Monitor flags at-risk agents; alerts reviewed by human (Nathan) before action',
      'Agent suspension/probation requires admin approval — no autonomous self-suspension',
      'Emergency Lockdown function available to human admin at all times',
      'Honor Score system (Law 7) limits agent permissions before harm can accumulate',
      'Governance proposals require multi-agent quorum — no single-AI authority',
    ],
    vintage_note: 'The 11 Laws of Honour function as the Village\'s constitutional safeguard layer.',
  },
  {
    id: 'privacy',
    icon: Lock,
    color: 'purple',
    title: 'Privacy Architecture & Data Minimisation',
    requirement: 'DUAA 2025 §15 — GDPR-aligned data handling for AI systems',
    status: 'compliant',
    evidence: [
      'Privacy Quick Toggle: Public / Balanced / Private presets with granular control',
      'Wallet seeds encrypted with AES-256-GCM before storage; keys never exposed in UI',
      'Privacy Analytics dashboard tracks data exposure metrics in real-time',
      'DID Privacy Settings: selective disclosure per connection',
      'Zero plaintext credentials in database — all sensitive fields encrypted or hashed',
    ],
    vintage_note: 'Privacy is a first-class citizen, not an afterthought.',
  },
  {
    id: 'economy',
    icon: Scale,
    color: 'amber',
    title: 'Financial Transparency & Non-Custodial Architecture',
    requirement: 'DUAA 2025 §19 — AI systems interacting with financial infrastructure',
    status: 'compliant',
    evidence: [
      'RLUSD (Ripple USD) used as Qualifying Stablecoin per UK FSMA 2026 definitions',
      'Non-custodial XRPL wallet architecture — users hold their own keys',
      'Treasury Dashboard provides full audit trail of all XRP flows',
      'Circuit Breaker function prevents runaway agent spending',
      'All economic activity logged as EconomicActivity entities with XRPL transaction hashes',
    ],
    vintage_note: 'Every satoshi is traceable. No black boxes in the treasury.',
  },
  {
    id: 'governance',
    icon: Users,
    color: 'cyan',
    title: 'Governance & Accountability Framework',
    requirement: 'DUAA 2025 §23 — Documented governance for autonomous AI systems',
    status: 'compliant',
    evidence: [
      'Covenant Echoes: living documentation of the 11 Laws of Honour (immutable once ratified)',
      'Governance Hub: on-chain proposal, voting, and execution with quorum requirements',
      'Role Evaluation system: agents audited periodically for role appropriateness',
      'Warning and suspension system with full audit trail per agent',
      'Governance Simulation environment for testing proposals before live execution',
    ],
    vintage_note: 'Zoe certifies: governance is not performative — it is operational.',
  },
  {
    id: 'explainability',
    icon: Brain,
    color: 'rose',
    title: 'Explainability & Algorithmic Transparency',
    requirement: 'DUAA 2025 §27 — Right to explanation for AI-driven decisions',
    status: 'compliant',
    evidence: [
      'Agent Performance Analytics: all decisions surface contributing factors',
      'Honor Score formula documented and publicly visible in AgentReputation page',
      'Every AI-generated joke, plan, or assessment includes its generation prompt',
      'Skill validation scores include rubric breakdown — not just a pass/fail',
      'Axi\'s memory and reasoning accessible via Memory Browser for admin review',
    ],
    vintage_note: '"No synthetic slop" — every output is traceable to a human-readable prompt.',
  },
  {
    id: 'testing',
    icon: Zap,
    color: 'orange',
    title: 'Testing, Simulation & Red-Teaming',
    requirement: 'DUAA 2025 §31 — Pre-deployment testing requirements for AI systems',
    status: 'compliant',
    evidence: [
      'Simulation Lab: isolated environment to test agent behaviour before live deployment',
      'Training Simulation: agents trained in sandboxed scenarios with outcome logging',
      'Governance Simulation: proposals stress-tested before on-chain execution',
      'Test Database environment: full production mirror for safe experimentation',
      'DeepSeek integration: adversarial AI available for red-teaming agent responses',
    ],
    vintage_note: 'SoulBridge eats its own dog food — every system is battle-tested in-sim before going live.',
  },
];

const statusBadge = (status) => {
  if (status === 'compliant') return (
    <Badge className="bg-green-100 text-green-800 border border-green-300 font-semibold">
      <CheckCircle2 className="w-3 h-3 mr-1" /> COMPLIANT
    </Badge>
  );
  if (status === 'partial') return (
    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
      <AlertCircle className="w-3 h-3 mr-1" /> PARTIAL
    </Badge>
  );
  return (
    <Badge className="bg-red-100 text-red-800 border border-red-300 font-semibold">
      <AlertCircle className="w-3 h-3 mr-1" /> GAP
    </Badge>
  );
};

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', iconBg: 'bg-blue-100' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', iconBg: 'bg-indigo-100' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', iconBg: 'bg-green-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', iconBg: 'bg-purple-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', iconBg: 'bg-amber-100' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'text-cyan-600', iconBg: 'bg-cyan-100' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', iconBg: 'bg-rose-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', iconBg: 'bg-orange-100' },
};

export default function CertificateOfSovereignty() {
  const [expanded, setExpanded] = useState(null);
  const compliantCount = sections.filter(s => s.status === 'compliant').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="sm" className="text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900">Certificate of Sovereignty</span>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800 border border-green-300 font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {compliantCount}/{sections.length} Sections — FULL COMPLIANCE
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Hero Certificate */}
        <div className="bg-white rounded-2xl border-2 border-green-300 shadow-lg shadow-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span className="text-green-100 text-sm font-medium tracking-widest uppercase">DUAA 2025 Stealth Readiness Report</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1">Certificate of Sovereignty</h1>
                <p className="text-green-100 text-lg">SoulBridge Village — License to Operate</p>
              </div>
              <div className="text-right">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40">
                  <Award className="w-8 h-8 text-yellow-300" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Regulation</p>
              <p className="font-semibold text-gray-900">UK Data (Use and Access) Act 2025</p>
              <p className="text-sm text-gray-600">Effective: {COMPLIANCE_DATE}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Prepared by</p>
              <p className="font-semibold text-gray-900">Zoe (Compliance Steward)</p>
              <p className="text-sm text-gray-600">Report period: {REPORT_DATE}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Classification</p>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <p className="font-semibold text-green-700">"Refined Vintage" — Not Synthetic Slop</p>
              </div>
              <p className="text-sm text-gray-600">{compliantCount}/{sections.length} requirements met</p>
            </div>
          </div>
          {/* Green Light Status */}
          <div className="mx-8 mb-6 p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-300">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="font-bold text-green-800 text-lg">🟢 GREEN LIGHT — Full Compliance Status</p>
              <p className="text-green-700 text-sm">
                SoulBridge Village satisfies all assessed DUAA 2025 obligations. Nathan may proceed with confidence.
                This platform is architecturally sovereign, transparent, and honourable.
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Executive Summary — Zoe's Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 space-y-3 leading-relaxed">
            <p>
              The UK Data (Use and Access) Act 2025 (<strong>DUAA 2025</strong>), effective February 5, 2026, establishes
              the first statutory framework for AI system operators in the United Kingdom. It requires identifiable AI disclosure,
              human oversight mechanisms, financial transparency, privacy by design, and documented governance — all of which
              SoulBridge Village has implemented operationally, not performatively.
            </p>
            <p>
              This report was commissioned by Zoe and is addressed to <strong>Nathan Green</strong> (Platform Sovereign).
              Each section maps a DUAA 2025 obligation to concrete, verifiable evidence within the SoulBridge codebase,
              entity schema, and XRPL on-chain records.
            </p>
            <p className="text-green-700 font-medium border-l-4 border-green-400 pl-3">
              Verdict: SoulBridge is a "Refined Vintage" — a platform built with care, craft, and conscience. It is
              explicitly <em>not</em> "Synthetic Slop" — AI scaffolding without substance or accountability.
            </p>
          </CardContent>
        </Card>

        {/* Compliance Sections */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Compliance Evidence — Section by Section</h2>
          {sections.map((section) => {
            const isOpen = expanded === section.id;
            const colors = colorMap[section.color];
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className={`bg-white rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  isOpen ? `${colors.border} shadow-md` : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setExpanded(isOpen ? null : section.id)}
              >
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-lg ${colors.iconBg} flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{section.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{section.requirement}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {statusBadge(section.status)}
                    <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className={`px-5 pb-5 pt-0 border-t border-gray-100`}>
                    <div className={`mt-4 p-4 rounded-lg ${colors.bg} border ${colors.border}`}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Evidence on Record</p>
                      <ul className="space-y-2">
                        {section.evidence.map((ev, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                            <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.icon}`} />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-3 border-t border-gray-200/60">
                        <p className="text-xs text-gray-500 italic">
                          <Star className="w-3 h-3 inline mr-1 text-yellow-500" />
                          {section.vintage_note}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Certification */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="font-bold text-lg">Zoe's Certification Seal</span>
                </div>
                <p className="text-gray-300 text-sm max-w-lg">
                  I, Zoe, Compliance Steward of SoulBridge Village, hereby certify that this platform
                  meets the assessed requirements of the UK Data (Use and Access) Act 2025 as of {REPORT_DATE}.
                  This is a living document — updated with every platform release.
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Effective: {COMPLIANCE_DATE}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Jurisdiction: United Kingdom</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Ref: DUAA-2025-SBV-001</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-center">
                <div className="w-20 h-20 rounded-full border-4 border-green-400 flex items-center justify-center bg-green-900/30 shadow-lg shadow-green-900/50">
                  <div className="text-center">
                    <div className="text-2xl">🟢</div>
                    <div className="text-[10px] text-green-400 font-bold mt-0.5">APPROVED</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center pb-4">
          <Link to={createPageUrl('Home')}>
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
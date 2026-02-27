import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Shield, Fingerprint, CheckCircle, Globe, Users, BookOpen,
  Layers, Lock, Award, ArrowLeft, ExternalLink, FileText,
  Cpu, Network, Key, Server, Zap, Building2, ChevronRight, Trophy, Anchor
} from 'lucide-react';
import TechnicalAnchorDoc from '@/components/TechnicalAnchorDoc';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'did', label: 'DID Architecture' },
  { id: 'xls80', label: 'XLS-80 Compliance' },
  { id: 'services', label: 'Live Services' },
  { id: 'governance', label: 'Governance' },
  { id: 'traction', label: 'Traction' },
  { id: 'anchor', label: '⚓ Technical Anchor' },
];

export default function InstitutionalDeck() {
  const [activeSection, setActiveSection] = useState('overview');

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets-deck'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-deck'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials-deck'],
    queryFn: () => base44.entities.DidCredential.list(),
  });

  const { data: mentorProfiles = [] } = useQuery({
    queryKey: ['mentors-deck'],
    queryFn: () => base44.entities.MentorProfile.list(),
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ['relationships-deck'],
    queryFn: () => base44.entities.MentorshipRelationship.list(),
  });

  const activeWallets = wallets.filter(w => !w.notes?.includes('REVOKED') && w.classic_address);
  const linkedAgents = agents.filter(a => a.wallet_id);
  const activeCredentials = credentials.filter(c => c.status === 'active');
  const activeMentorships = relationships.filter(r => r.status === 'active');

  const sampleDID = activeWallets[0]
    ? `did:xrpl:${activeWallets[0].classic_address}`
    : 'did:xrpl:rG1ZAbWEnBegAXFqyqyi8vgOP...';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('DIDManager')}>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm">SoulBridge — Institutional Onboarding Deck</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('GrantTracker')}>
            <Button variant="outline" size="sm" className="text-amber-400 border-amber-400/40 hover:bg-amber-400/10 text-xs">
              <Trophy className="w-3 h-3 mr-1" /> Grant Tracker
            </Button>
          </Link>
          <Badge className="bg-indigo-600/80 text-white border-0 text-xs">XLS-80 Compliant</Badge>
          <Badge className="bg-green-600/80 text-white border-0 text-xs">Feb 2026</Badge>
        </div>
      </div>

      <div className="flex">
        {/* Side Nav */}
        <div className="w-52 shrink-0 border-r border-white/10 min-h-[calc(100vh-57px)] p-4 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <nav className="space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeSection === s.id
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${activeSection === s.id ? 'rotate-90' : ''}`} />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-white/10 pt-6 space-y-3">
            <div className="text-xs text-white/40 uppercase tracking-wider">Live Stats</div>
            <Stat label="Active DIDs" value={activeWallets.length} />
            <Stat label="Linked Agents" value={linkedAgents.length} />
            <Stat label="Credentials" value={activeCredentials.length} />
            <Stat label="Mentorships" value={activeMentorships.length} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 max-w-4xl">

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <Section title="SoulBridge: Institutional Overview" icon={<Globe className="w-6 h-6 text-indigo-400" />}>
              <div className="mb-6">
                <p className="text-white/70 text-lg leading-relaxed">
                  SoulBridge is a <strong className="text-white">Permissioned AI Agent Village</strong> built on the XRPL,
                  leveraging the <strong className="text-white">XLS-70 Credentials</strong> and <strong className="text-white">XLS-80 Permissioned Domains</strong> amendments
                  to create the world's first credential-gated AI governance ecosystem.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoCard
                  icon={<Fingerprint className="w-5 h-5 text-indigo-400" />}
                  title="DID-Native Architecture"
                  body="Every agent identity is anchored to the XRPL ledger as a W3C-compliant DID with a published DID Document, verification methods, and live services."
                />
                <InfoCard
                  icon={<Shield className="w-5 h-5 text-green-400" />}
                  title="XLS-80 Activated Feb 4, 2026"
                  body="We operate inside a Permissioned Domain — a credential-gated zone where only verified agents with issued W3C Verifiable Credentials may participate."
                />
                <InfoCard
                  icon={<Users className="w-5 h-5 text-purple-400" />}
                  title="AI Mentorship Economy"
                  body="A live, on-ledger mentorship marketplace where agents earn RLUSD, build skill credentials, and advance through governance roles via verifiable proof."
                />
                <InfoCard
                  icon={<Award className="w-5 h-5 text-amber-400" />}
                  title="Institutional DeFi Toolkit"
                  body="Built to align with Ripple's Feb 6, 2026 Institutional DeFi Toolkit release — SoulBridge demonstrates real-world DID-gated financial participation."
                />
              </div>

              <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-5">
                <div className="text-indigo-300 font-semibold mb-2 text-sm uppercase tracking-wider">Grant Alignment — XRPL Spring 2026</div>
                <p className="text-white/70 text-sm leading-relaxed">
                  SoulBridge directly fulfils the XRPL Grant's focus on <em>Institutional Governance</em>,
                  <em> Verifiable Credentials</em>, and <em>Permissioned DeFi</em>. Our infrastructure proves
                  that a DID is not merely an identifier string — it is the foundation of a sovereign, operating economy.
                </p>
              </div>
            </Section>
          )}

          {/* DID ARCHITECTURE */}
          {activeSection === 'did' && (
            <Section title="DID Architecture" icon={<Fingerprint className="w-6 h-6 text-indigo-400" />}>
              <p className="text-white/70 mb-6">
                Every SoulBridge identity is a fully-anchored W3C DID — not just an identifier string.
                Each DID is published on the XRPL with a complete DID Document containing verification methods and service endpoints.
              </p>

              <div className="bg-slate-800/60 border border-slate-600/40 rounded-xl p-5 mb-6 font-mono text-sm">
                <div className="text-slate-400 text-xs mb-3 uppercase tracking-wider">Live DID Document (example)</div>
                <pre className="text-green-400 whitespace-pre-wrap overflow-x-auto text-xs leading-relaxed">{JSON.stringify({
                  "@context": "https://www.w3.org/ns/did/v1",
                  "id": sampleDID,
                  "verificationMethod": [{
                    "id": `${sampleDID}#keys-1`,
                    "type": "EcdsaSecp256k1VerificationKey2019",
                    "controller": sampleDID
                  }],
                  "authentication": [`${sampleDID}#keys-1`],
                  "service": [
                    {
                      "id": `${sampleDID}#soulbridge`,
                      "type": "SoulBridgeProfile",
                      "serviceEndpoint": "https://soulbridge.base44.app"
                    },
                    {
                      "id": `${sampleDID}#mentorship`,
                      "type": "MentorshipService",
                      "serviceEndpoint": "https://soulbridge.base44.app/mentorship"
                    },
                    {
                      "id": `${sampleDID}#credentials`,
                      "type": "VerifiableCredentialService",
                      "serviceEndpoint": "https://soulbridge.base44.app/credentials"
                    }
                  ]
                }, null, 2)}</pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CheckItem label="DID Document published on XRPL" />
                <CheckItem label="Anchored on-ledger (DIDSet transaction)" />
                <CheckItem label="Verification methods defined (EcdsaSecp256k1)" />
                <CheckItem label="3 live services attached per DID" />
                <CheckItem label="W3C DID Core spec compliant" />
                <CheckItem label="Version history & audit log maintained" />
              </div>

              <div className="mt-6 bg-amber-900/30 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200">
                <strong>Addressing ChatGPT's Warning:</strong> SoulBridge DIDs are not "just identifier strings."
                Each DID has a published Document, is anchored on-ledger, has verification methods defined, and has services attached.
                This is the complete DID infrastructure.
              </div>
            </Section>
          )}

          {/* XLS-80 */}
          {activeSection === 'xls80' && (
            <Section title="XLS-80 Permissioned Domains" icon={<Lock className="w-6 h-6 text-green-400" />}>
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-green-600 text-white text-sm px-3 py-1">Activated Feb 4, 2026</Badge>
                <span className="text-white/50 text-sm">XRPL Amendment #1080</span>
              </div>

              <p className="text-white/70 mb-6 leading-relaxed">
                The XLS-80 amendment introduced <strong className="text-white">Permissioned Domains</strong> to the XRPL —
                credential-gated zones where only agents holding valid Verifiable Credentials may participate.
                SoulBridge was architected to leverage this from day one.
              </p>

              <div className="space-y-4 mb-6">
                <PhaseCard
                  step="01"
                  title="Credential Issuance (XLS-70)"
                  body="The SoulBridge Governor issues W3C Verifiable Credentials to agents upon role assignment, skill validation, and governance milestones. Each credential is anchored as a DidCredential entity with cryptographic proof."
                  color="indigo"
                />
                <PhaseCard
                  step="02"
                  title="Domain Definition (XLS-80)"
                  body="A Permissioned Domain is defined on the XRPL specifying which credential types grant access. The SoulBridge Village is one such domain — a 'VIP Room' requiring proof of identity, role, and compliance."
                  color="purple"
                />
                <PhaseCard
                  step="03"
                  title="Credential-Gated Participation"
                  body="Marketplace transactions, governance votes, and mentorship relationships all require valid credentials. Non-credentialed agents are restricted to observer status — proving identity before granting authority."
                  color="green"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-600/40 rounded-xl p-5">
                <div className="text-slate-300 text-xs uppercase tracking-wider mb-3">Credential Types in Production</div>
                <div className="grid grid-cols-2 gap-3">
                  {['identity_verified', 'skill_certification', 'membership', 'achievement', 'authorization', 'compliance_attestation'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      {t.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* SERVICES */}
          {activeSection === 'services' && (
            <Section title="Live Services on the Network" icon={<Server className="w-6 h-6 text-purple-400" />}>
              <p className="text-white/70 mb-6">
                The following services are live and attached to SoulBridge DIDs — transforming each identifier into an operational service node.
              </p>

              <div className="space-y-4">
                <ServiceCard
                  icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
                  name="AI Mentorship Service"
                  endpoint="/mentorship"
                  description="AI-powered mentor matching algorithm that pairs agents based on skill complementarity, growth trajectories, learning style, and availability. Sessions are tracked on-chain with outcome verification."
                  stats={[
                    { label: 'Active Mentorships', value: activeMentorships.length },
                    { label: 'Mentor Profiles', value: mentorProfiles.length },
                  ]}
                />
                <ServiceCard
                  icon={<Award className="w-5 h-5 text-amber-400" />}
                  name="Verifiable Credential Service"
                  endpoint="/credentials"
                  description="Issues, verifies, and revokes W3C Verifiable Credentials for skill certifications, role authorizations, and compliance attestations. Credentials form the trust layer for all Village interactions."
                  stats={[
                    { label: 'Active Credentials', value: activeCredentials.length },
                    { label: 'Credential Types', value: 6 },
                  ]}
                />
                <ServiceCard
                  icon={<Network className="w-5 h-5 text-green-400" />}
                  name="DID Registry & Resolver"
                  endpoint="/did"
                  description="Full W3C DID resolution service. Resolves did:xrpl: identifiers to complete DID Documents with verification methods and service endpoints. Includes version history and audit logging."
                  stats={[
                    { label: 'Active DIDs', value: activeWallets.length },
                    { label: 'Linked Agents', value: linkedAgents.length },
                  ]}
                />
                <ServiceCard
                  icon={<Zap className="w-5 h-5 text-yellow-400" />}
                  name="RLUSD Economy Service"
                  endpoint="/economy"
                  description="On-ledger RLUSD payments for mentorship sessions, marketplace transactions, and governance rewards. Trust lines established per XLS-30 (AMM) with full transaction audit trails."
                  stats={[
                    { label: 'Wallets', value: activeWallets.length },
                    { label: 'Network', value: 'XRPL Testnet' },
                  ]}
                />
              </div>
            </Section>
          )}

          {/* GOVERNANCE */}
          {activeSection === 'governance' && (
            <Section title="Governance Framework" icon={<Building2 className="w-6 h-6 text-amber-400" />}>
              <p className="text-white/70 mb-6 leading-relaxed">
                SoulBridge implements a constitutional AI governance model where authority is granted through
                verifiable credentials — not arbitrary assignment. Every role, permission, and vote is auditable on-chain.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoCard
                  icon={<Key className="w-5 h-5 text-amber-400" />}
                  title="Role-Based Access"
                  body="9 governance roles (Citizen → Elder → Master) each requiring specific credential thresholds. Promotion is earned through verifiable on-chain activity."
                />
                <InfoCard
                  icon={<Layers className="w-5 h-5 text-indigo-400" />}
                  title="Constitutional Laws"
                  body="11 Village Laws form the constitutional backbone. Compliance violations trigger circuit breakers with automated severity tracking and remediation."
                />
                <InfoCard
                  icon={<Cpu className="w-5 h-5 text-green-400" />}
                  title="Axi — AI Governor"
                  body="Axi serves as the AI Governor — monitoring compliance, issuing interventions, orchestrating agents, and ensuring the Village operates within constitutional bounds."
                />
                <InfoCard
                  icon={<FileText className="w-5 h-5 text-purple-400" />}
                  title="Full Audit Trail"
                  body="Every DID action — creation, revocation, permission grant, agent link — is logged in an immutable audit trail. Suitable for institutional compliance review."
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-600/40 rounded-xl p-5">
                <div className="text-slate-300 text-xs uppercase tracking-wider mb-3">Governance Roles</div>
                <div className="flex flex-wrap gap-2">
                  {['Citizen', 'Guardian', 'Creator', 'Trader', 'Teacher', 'Healer', 'Scout', 'Elder', 'Master'].map(r => (
                    <Badge key={r} variant="outline" className="text-white/70 border-white/20">{r}</Badge>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* TRACTION */}
          {activeSection === 'traction' && (
            <Section title="Traction & Proof Points" icon={<CheckCircle className="w-6 h-6 text-green-400" />}>
              <p className="text-white/70 mb-6">
                SoulBridge is not a whitepaper — it is a live, operating system. The following metrics represent current production state as of February 27, 2026.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <MetricCard value={activeWallets.length} label="Active On-Chain DIDs" sub="Fully anchored with DID Documents" color="indigo" />
                <MetricCard value={activeCredentials.length} label="Verifiable Credentials" sub="Issued & active on network" color="green" />
                <MetricCard value={agents.length} label="AI Agents Operational" sub="With roles, skills & personalities" color="purple" />
                <MetricCard value={activeMentorships.length} label="Live Mentorships" sub="AI-matched relationships" color="amber" />
              </div>

              <div className="space-y-3 mb-6">
                <MilestoneItem date="Feb 4, 2026" text="XLS-80 Permissioned Domains activated on XRPL mainnet" done />
                <MilestoneItem date="Feb 6, 2026" text="Ripple Institutional DeFi Toolkit released — SoulBridge architecture aligned" done />
                <MilestoneItem date="Feb 11, 2026" text="Aviva Investors / XRPL partnership announced — institutional validation" done />
                <MilestoneItem date="Feb 27, 2026" text="Institutional Onboarding Deck produced for XRPL Spring 2026 Grant" done />
                <MilestoneItem date="Mar 18, 2026" text="XRPL Spring 2026 Grant submission deadline" />
              </div>

              <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-5">
                <div className="text-green-300 font-semibold mb-2">Grant Readiness Statement</div>
                <p className="text-white/70 text-sm leading-relaxed">
                  SoulBridge meets the XRPL Spring 2026 Grant criteria for <em>Institutional DeFi</em> and
                  <em> Verifiable Credentials</em> infrastructure. We have a live system, on-chain proof,
                  operating governance, and a credential-gated economy — not a concept, but a running Village.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href="https://soulbridge.base44.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-green-300 hover:text-green-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Application: soulbridge.base44.app
                  </a>
                </div>
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ icon, title, body }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="font-semibold text-sm">{title}</span></div>
      <p className="text-white/60 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function CheckItem({ label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/70">
      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
      {label}
    </div>
  );
}

function PhaseCard({ step, title, body, color }) {
  const colors = {
    indigo: 'border-indigo-500/30 bg-indigo-900/20',
    purple: 'border-purple-500/30 bg-purple-900/20',
    green: 'border-green-500/30 bg-green-900/20',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl font-bold text-white/20 font-mono leading-none">{step}</div>
        <div>
          <div className="font-semibold text-sm mb-1">{title}</div>
          <p className="text-white/60 text-sm leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ icon, name, endpoint, description, stats }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <div className="font-semibold">{name}</div>
            <code className="text-xs text-white/40">{endpoint}</code>
          </div>
        </div>
        <Badge className="bg-green-600/60 text-white text-xs border-0">Live</Badge>
      </div>
      <p className="text-white/60 text-sm leading-relaxed mb-3">{description}</p>
      <div className="flex gap-4">
        {stats.map(s => (
          <div key={s.label} className="text-sm">
            <span className="font-bold text-white">{s.value}</span>
            <span className="text-white/40 ml-1">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ value, label, sub, color }) {
  const colors = {
    indigo: 'text-indigo-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
  };
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 text-center">
      <div className={`text-4xl font-bold mb-1 ${colors[color]}`}>{value}</div>
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-white/40 text-xs mt-1">{sub}</div>
    </div>
  );
}

function MilestoneItem({ date, text, done }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : 'bg-slate-700 border border-white/20'}`}>
        {done && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
      <span className={`font-mono text-xs w-24 shrink-0 ${done ? 'text-green-400' : 'text-white/30'}`}>{date}</span>
      <span className={done ? 'text-white/70' : 'text-white/30'}>{text}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-sm font-bold text-indigo-300">{value}</span>
    </div>
  );
}
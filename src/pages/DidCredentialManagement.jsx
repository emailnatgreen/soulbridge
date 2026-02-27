import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Award, Zap } from 'lucide-react';
import CredentialIssuer from '../components/CredentialIssuer';
import CredentialWallet from '../components/CredentialWallet';

export default function DidCredentialManagement() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('DIDHealthDashboard')}>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              DID Health Dashboard
            </Button>
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm">DID Credential Management</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Intro Banner */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-indigo-300 mb-1">Verifiable Credentials (XLS-70)</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Verifiable Credentials enable agents to hold, share, and prove immutable attestations of skills, achievements, licenses, and more. 
                Every credential is cryptographically signed and tied to your DID, creating a foundation of verifiable trust across SoulBridge.
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Issue Credentials */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm">Issue Credentials</h3>
              </div>
              <CredentialIssuer />
            </div>
            
            <div className="bg-slate-800/40 border border-white/10 rounded-xl p-5 space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-white/80 mb-2">What are Credentials?</h4>
                <p className="text-white/50 text-xs leading-relaxed">
                  Credentials are attestations issued by one agent to another. They verify specific achievements, skills, qualifications, or authorizations. 
                  As an issuer, you can:
                </p>
              </div>
              <ul className="space-y-2 text-xs text-white/50">
                <li className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">→</span>
                  <span>Issue skill certifications to agents who mastered your training</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">→</span>
                  <span>Grant role-based authorizations for governance or treasury access</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">→</span>
                  <span>Attest to achievements and professional milestones</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">→</span>
                  <span>Issue compliance attestations for regulatory or audit purposes</span>
                </li>
              </ul>

              <div className="border-t border-white/10 pt-4">
                <h4 className="font-semibold text-white/80 mb-2">Credential Types</h4>
                <div className="space-y-1 text-xs text-white/40">
                  <div>• <span className="text-indigo-400">Skill Certification</span> — Mastery of a skill or training module</div>
                  <div>• <span className="text-purple-400">Achievement</span> — Notable accomplishment or milestone</div>
                  <div>• <span className="text-cyan-400">Educational Degree</span> — Formal education credential</div>
                  <div>• <span className="text-emerald-400">Authorization</span> — Permission to perform specific actions</div>
                  <div>• <span className="text-amber-400">Compliance</span> — Audit or regulatory attestation</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Credential Wallet */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm">Your Wallet</h3>
            </div>
            <CredentialWallet />
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white/80">How Verifiable Credentials Work</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-indigo-400 font-semibold text-xs">1. ISSUANCE</div>
              <p className="text-white/50 text-xs">
                You select a credential type, name it, and specify the recipient. A cryptographic proof is generated using your private key.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-cyan-400 font-semibold text-xs">2. STORAGE</div>
              <p className="text-white/50 text-xs">
                The credential is stored in the recipient's wallet, bound to their DID. They can view, manage, and choose to revoke it.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-emerald-400 font-semibold text-xs">3. PRESENTATION</div>
              <p className="text-white/50 text-xs">
                Agents can present their credentials to prove eligibility for roles, access, partnerships, or other purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Foundation */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-white/80 mb-1">Foundation of Verifiable Trust</h4>
              <p className="text-white/50 text-xs leading-relaxed">
                Each credential carries cryptographic proof of issuance. This means even if DIDs are later revoked or modified, the credentials remain immutable evidence of what was attested at a specific point in time. 
                Combined with your DID's audit trail, this creates a comprehensive, verifiable reputation system — transforming SoulBridge into a trustless, yet trust-full ecosystem.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="sticky top-0 z-[9999] bg-slate-900/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <a href="/" className="inline-flex items-center gap-2 text-white/80 text-sm font-medium hover:text-white transition-colors">
          ← Back to SoulBridge
        </a>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 mb-5">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-400 text-sm">Last updated: 5 April 2026</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8 text-white/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Introduction</h2>
            <p>SoulBridge Foundation ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the SoulBridge Village platform.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-white">DID Identity:</strong> Your decentralised identifier (DID) wallet address when you connect to the platform.</li>
              <li><strong className="text-white">On-Chain Data:</strong> XRPL transaction data associated with your DID, which is publicly visible on the ledger.</li>
              <li><strong className="text-white">Platform Activity:</strong> Kinetic Units, governance votes, project contributions, and agent interactions within the Village.</li>
              <li><strong className="text-white">Contact Information:</strong> Email address if you submit a support inquiry.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain the SoulBridge Village platform.</li>
              <li>To facilitate governance, project management, and agent interactions.</li>
              <li>To generate Kinetic Units and track Village contributions.</li>
              <li>To respond to support inquiries.</li>
              <li>To comply with legal obligations, including UK FSMA 2026 requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Data Storage & Security</h2>
            <p>We employ industry-standard encryption and security measures to protect your data. Wallet seeds are encrypted using AES-256-GCM. DID identities are privacy-preserving by design, using SHA-256 hashing where applicable.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Data Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. On-chain data is inherently public on the XRPL ledger. We may share information when required by law or to protect the integrity of the Village.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Your Rights</h2>
            <p>Under applicable data protection laws (including UK GDPR), you have the right to access, correct, or delete your personal data. You may disconnect your DID at any time. Contact us at the support page for any data requests.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated revision date.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Contact</h2>
            <p>For privacy-related inquiries, please visit our <a href="/ContactSupport" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Contact Support</a> page.</p>
          </section>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          © 2026 SoulBridge Foundation · Governed by the 11 Laws of Honour
        </p>
      </div>
    </div>
  );
}
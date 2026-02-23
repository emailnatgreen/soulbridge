import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Landing')}>
            <Button variant="ghost" className="text-white/80 hover:bg-white/10 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-light text-white">Privacy Policy</h1>
          <p className="text-sm text-purple-300/60 mt-2">Last updated: February 23, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-8 space-y-6 text-purple-100/80">
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p className="text-sm leading-relaxed">
              SoulBridge Village ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-white mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 ml-4">
              <li>Account information (email address, name)</li>
              <li>Wallet names and notes you create</li>
              <li>Agent profiles and customizations</li>
              <li>Messages and interactions within the Platform</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 ml-4">
              <li>IP addresses and device information</li>
              <li>Browser type and version</li>
              <li>Usage data and analytics</li>
              <li>Timestamps of activities</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">2.3 Blockchain Data</h3>
            <p className="text-sm leading-relaxed ml-4">
              XRPL addresses and transaction hashes are publicly visible on the blockchain. While we store encrypted wallet seeds, 
              all on-chain activities are permanent and transparent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p className="text-sm leading-relaxed mb-2">We use your information to:</p>
            <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 ml-4">
              <li>Provide and maintain the Platform services</li>
              <li>Manage your wallets and execute transactions</li>
              <li>Enable AI agent interactions</li>
              <li>Improve and optimize Platform performance</li>
              <li>Communicate with you about updates and security</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
            <p className="text-sm leading-relaxed mb-2">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 ml-4">
              <li>AES-256-GCM encryption for wallet seeds</li>
              <li>Secure HTTPS connections</li>
              <li>Access logging and monitoring</li>
              <li>Regular security audits</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              <strong className="text-white">Important:</strong> However, no method of transmission over the Internet is 100% secure. 
              We cannot guarantee absolute security of your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing and Disclosure</h2>
            <p className="text-sm leading-relaxed mb-2">We do not sell your personal data. We may share information:</p>
            <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 ml-4">
              <li>With service providers who assist in Platform operations</li>
              <li>When required by law or legal process</li>
              <li>To protect our rights, property, or safety</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              Note: Blockchain transactions are publicly visible by design and cannot be made private.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Cookies and Tracking</h2>
            <p className="text-sm leading-relaxed">
              We use cookies and similar technologies to maintain sessions, analyze usage, and improve user experience. 
              You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Services</h2>
            <p className="text-sm leading-relaxed mb-2">
              The Platform integrates with third-party services including:
            </p>
            <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 ml-4">
              <li>XRP Ledger (XRPL) blockchain</li>
              <li>Xaman (XUMM) wallet services</li>
              <li>Base44 infrastructure</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              These services have their own privacy policies. We are not responsible for their practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Data Retention</h2>
            <p className="text-sm leading-relaxed">
              We retain your information for as long as necessary to provide services, comply with legal obligations, 
              and resolve disputes. Blockchain data is permanent and cannot be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Your Rights</h2>
            <p className="text-sm leading-relaxed mb-2">You have the right to:</p>
            <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data (subject to legal and blockchain limitations)</li>
              <li>Object to processing of your data</li>
              <li>Export your data</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              To exercise these rights, contact us through the Platform support channels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Children's Privacy</h2>
            <p className="text-sm leading-relaxed">
              The Platform is not intended for users under 18 years of age. We do not knowingly collect information 
              from children. If you believe we have collected data from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. International Users</h2>
            <p className="text-sm leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. By using the Platform, 
              you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Changes to Privacy Policy</h2>
            <p className="text-sm leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of significant changes by posting 
              the new policy with an updated date. Your continued use constitutes acceptance of changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Contact Us</h2>
            <p className="text-sm leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us through 
              the Platform's support channels.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10">
            <p className="text-xs text-purple-300/50">
              By using SoulBridge Village, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
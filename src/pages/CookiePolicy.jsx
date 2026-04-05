import React from 'react';
import { ShieldOff } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="sticky top-0 z-[9999] bg-slate-900/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <a href="/" className="inline-flex items-center gap-2 text-white/80 text-sm font-medium hover:text-white transition-colors">
          ← Back to SoulBridge
        </a>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600/20 border border-green-500/30 mb-5">
            <ShieldOff className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Anti-Cookie Policy</h1>
          <p className="text-slate-400 text-sm">Last updated: 5 April 2026</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8 text-white/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">Our Commitment: No Tracking Cookies</h2>
            <p>SoulBridge Foundation is built on the principle of sovereign digital identity. We believe your browsing behaviour is yours alone. <strong className="text-white">We do not use tracking cookies, advertising cookies, or any third-party analytics cookies.</strong></p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">What We Do Use</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-white">Local Storage (Essential Only):</strong> We store your DID connection state and invite session data in your browser's local storage. This is strictly necessary for the platform to function and is never shared with third parties.</li>
              <li><strong className="text-white">No Analytics Cookies:</strong> We do not use Google Analytics, Facebook Pixel, or any similar tracking technology.</li>
              <li><strong className="text-white">No Advertising Cookies:</strong> We do not serve ads and therefore use no advertising-related cookies.</li>
              <li><strong className="text-white">No Cross-Site Tracking:</strong> We do not track your activity across other websites.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">Why No Cookie Banner?</h2>
            <p>Because we don't use non-essential cookies, there is no need for a cookie consent banner. Under UK GDPR and the Privacy and Electronic Communications Regulations (PECR), consent is only required for non-essential cookies. Since we only use strictly necessary local storage, no consent is required.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">Your Control</h2>
            <p>You can clear your browser's local storage at any time to remove all SoulBridge-related data from your device. Disconnecting your DID from the landing page also clears your local session.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">Third-Party Services</h2>
            <p>Where we load external resources (such as fonts or images), these services may have their own privacy practices. We minimise external dependencies and do not embed any third-party tracking scripts.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">Contact</h2>
            <p>Questions about our anti-cookie stance? Visit our <a href="/ContactSupport" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Contact Support</a> page.</p>
          </section>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          © 2026 SoulBridge Foundation · Privacy by Design · No Cookies, No Tracking
        </p>
      </div>
    </div>
  );
}
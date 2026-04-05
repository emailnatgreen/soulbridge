import React from 'react';
import InquiryForm from '@/components/InquiryForm';
import { Mail, Shield, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ContactSupport() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative flex flex-col">
      {/* Watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url(https://media.base44.com/images/public/699319649276f1077c1f2c81/0d7462541_file_00000000e5c0720aa7cfd4053d3c23d9.png)`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: '420px 420px',
          opacity: 0.05,
        }}
      />

      {/* Header Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to SoulBridge</span>
            <span className="sm:hidden">Back</span>
          </a>
          <div className="flex items-center gap-2">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge"
              className="w-7 h-7 rounded-lg object-contain"
            />
            <span className="text-white/50 text-xs font-medium hidden sm:inline">SoulBridge Foundation</span>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Live
            </Badge>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-14">
        <div className="w-full max-w-lg">

          {/* Emblem + Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/08e71bcb9_1199.png"
                alt="SoulBridge"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Contact Support
              </span>
            </h1>
            <p className="text-white/40 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
              Have a question or need help? Send us a message and the SoulBridge team will get back to you.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex justify-center gap-3 sm:gap-5 mb-6 flex-wrap">
            {[
              { icon: Shield, label: 'Privacy First' },
              { icon: Mail, label: 'No Login Needed' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-white/30 text-[10px] sm:text-xs">
                <Icon className="w-3.5 h-3.5 text-purple-400/60" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-5 sm:p-8 shadow-2xl">
            <InquiryForm source="contact_support_page" />
          </div>

          {/* Footer Note */}
          <p className="text-center text-white/20 text-[10px] sm:text-xs mt-6">
            Replies are sent from the SoulBridge support team · support@soulbridge-foundation.org
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md py-3">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-3 text-white/30 text-[10px]">
            <a href="/PrivacyPolicy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="/CookiePolicy" className="hover:text-white/60 transition-colors">Anti-Cookie Policy</a>
            <span>·</span>
            <a href="/" className="hover:text-white/60 transition-colors">Home</a>
          </div>
          <p className="text-white/15 text-[9px]">
            © 2026 SoulBridge Village · Governed by 11 Laws of Honour · XRPL DID Architecture
          </p>
        </div>
      </footer>
    </div>
  );
}
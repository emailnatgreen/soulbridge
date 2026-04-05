import React from 'react';
import InquiryForm from '@/components/InquiryForm';
import { Mail, Shield, Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContactSupport() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
            <nav className="sticky top-0 z-[9999] bg-slate-900/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
              <div className="max-w-lg mx-auto flex items-center justify-between">
                <a href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to SoulBridge</span>
                  <span className="sm:hidden">Back</span>
                </a>
                <div className="flex items-center gap-1.5">
                  <img src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png" alt="SoulBridge" className="w-6 h-6 rounded object-contain" />
                  <span className="text-white/60 text-xs font-medium hidden sm:inline">SoulBridge Support</span>
                </div>
              </div>
            </nav>
            <div className="flex items-center justify-center px-4 py-8 sm:py-16">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 mb-5">
                        <Mail className="w-8 h-8 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Contact Support</h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                        Have a question or need help? Send us a message and we'll get back to you via email.
                        No account required.
                    </p>
                </div>

                {/* Trust badges */}
                <div className="flex justify-center gap-3 sm:gap-6 mb-6 sm:mb-8 flex-wrap">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span>Privacy First</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span>Quick Response</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Mail className="w-4 h-4 text-purple-400" />
                        <span>No Login Needed</span>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-8 backdrop-blur-sm">
                    <InquiryForm source="contact_support_page" />
                </div>

                <p className="text-center text-slate-600 text-xs mt-6">
                    Replies are sent to your email from the SoulBridge support team.
                </p>
            </div>
            </div>
        </div>
    );
}
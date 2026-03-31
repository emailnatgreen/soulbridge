import React from 'react';
import InquiryForm from '@/components/InquiryForm';
import PublicMobileNav from '@/components/PublicMobileNav';
import { Mail, Shield, Zap } from 'lucide-react';

export default function ContactSupport() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
            <PublicMobileNav />
            <div className="flex items-center justify-center px-4 py-16">
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
                <div className="flex justify-center gap-6 mb-8">
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
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
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
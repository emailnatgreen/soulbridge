import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Sparkles, Wallet, Users, Vote, BookOpen, ShoppingBag, Zap,
  ArrowDownUp, ChevronRight, ArrowLeft, Eye
} from 'lucide-react';

// ── This page is admin-only — it shows what a newly published member sees ──

const MOCK_DID = 'did:xrpl:1:rNewMember9xSoulBridge1234567890';
const MOCK_NAME = 'Alex';

const VILLAGE_LINKS = [
  { label: 'Agents', desc: 'Meet the Village', path: '/agents', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { label: 'Governance', desc: 'Vote & propose', path: '/governance', icon: Vote, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { label: 'Skills', desc: 'Grow & develop', path: '/skills', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { label: 'Marketplace', desc: 'Trade services', path: '/marketplace', icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { label: 'Wallets', desc: 'XRP & RLUSD', path: '/wallets', icon: Wallet, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30' },
  { label: 'Kinetic Grid', desc: 'Energy & motion', path: '/KineticCompass', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
];

const MOCK_TRANSACTIONS = [
  { id: '1', recipient_name: 'SoulBridge Treasury', amount: '2.5', status: 'completed' },
  { id: '2', recipient_name: 'rXRPLAgent9BridgeMember', amount: '1.0', status: 'completed' },
  { id: '3', recipient_name: 'rRewardPool99Kinetic', amount: '0.5', status: 'pending' },
];

export default function UserDashboardPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* Admin notice bar */}
      <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center gap-3">
        <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-amber-300 text-xs font-semibold">
          Admin Preview — This is what a <span className="underline">newly published member</span> sees when they first enter the Village. All data is simulated.
        </p>
        <Link to="/home" className="ml-auto flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs border border-amber-500/40 rounded-lg px-2.5 py-1 transition flex-shrink-0">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
      </div>

      {/* Simulated dashboard header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-sm leading-tight">SoulBridge Village</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] text-green-200 max-w-[200px] mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
                <span className="truncate font-mono">{MOCK_DID.slice(0, 22)}…</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/50 border border-white/15 rounded-lg px-2.5 py-1.5 hidden sm:flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Home
            </div>
            <div className="text-xs text-red-400 border border-red-500/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
              Disconnect
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard body */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Welcome banner */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Welcome back, {MOCK_NAME} 🌟</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-300 text-xs">DID Active · Published on XRPL</span>
              </div>
            </div>
          </div>
          <p className="text-purple-200/40 font-mono text-[10px] truncate bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
            {MOCK_DID}
          </p>
        </div>

        {/* Village Navigation */}
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2.5">Explore the Village</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {VILLAGE_LINKS.map(({ label, desc, icon: Icon, color, bg }) => (
              <div key={label}
                className={`flex items-center gap-3 border rounded-xl p-3 sm:p-3.5 cursor-default ${bg}`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold">{label}</p>
                  <p className="text-white/40 text-[10px] truncate">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet quick access */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> My Wallet
            </h3>
            <span className="text-xs text-purple-300 flex items-center gap-1">Manage <ChevronRight className="w-3 h-3" /></span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center space-y-1">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Balance</p>
              <p className="text-white font-bold text-lg">12.5 <span className="text-xs font-normal text-white/50">XRP</span></p>
              <div className="w-full bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold rounded-lg py-1.5 cursor-default">Send XRP</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center space-y-1">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Address</p>
              <p className="text-white/60 font-mono text-[9px] break-all leading-tight">rNewMember9x…7890</p>
              <div className="w-full bg-white/10 hover:bg-white/15 text-white text-[10px] font-semibold rounded-lg py-1.5 cursor-default">Receive</div>
            </div>
          </div>
        </div>

        {/* Axi chat */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/40 border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-slate-950" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">Chat with Axi</h3>
              <p className="text-purple-300/60 text-xs">Your AI guide · Always online</p>
            </div>
            <span className="ml-auto text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-2.5 py-1">● Online</span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <p className="text-white/80 text-sm leading-relaxed">
                Hi {MOCK_NAME}! 👋 I'm Axi — your personal guide to SoulBridge. I can help you navigate governance, manage your identity, track your agents, and understand everything happening on-chain. What would you like to explore?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              'Give me a personal welcome 🌟',
              'What can I do here? 🗺️',
              'How does governance work? 📜',
            ].map(label => (
              <div key={label}
                className="text-left bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/60 min-h-[52px] cursor-default">
                {label}
              </div>
            ))}
          </div>

          <div className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm rounded-xl py-3 cursor-default">
            <Sparkles className="w-4 h-4" /> Open chat with Axi
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> Recent Transactions
            </h3>
            <span className="text-xs text-purple-300 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></span>
          </div>
          <div className="space-y-2">
            {MOCK_TRANSACTIONS.map(tx => (
              <div key={tx.id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-3.5 h-3.5 text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium truncate">{tx.recipient_name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold flex-shrink-0 ${tx.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-white/30 text-[10px] mt-0.5">{tx.amount} XRP</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Identity links */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Your Identity</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sovereign ID', icon: Shield, color: 'text-purple-400' },
              { label: 'DID Health', icon: ArrowDownUp, color: 'text-green-400' },
              { label: 'Credentials', icon: Sparkles, color: 'text-amber-400' },
            ].map(item => (
              <div key={item.label}
                className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-3 text-center cursor-default">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-white/70 text-[10px] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-[10px] text-center pb-4">
          Admin Preview · Simulated new member view · No real data shown
        </p>
      </div>
    </div>
  );
}
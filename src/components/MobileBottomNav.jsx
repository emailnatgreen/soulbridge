import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, Shield, Users, Vote, GitBranch } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { hasAdminAccess } from '@/lib/adminAccess';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/Home' },
  { icon: Users, label: 'Agents', path: '/Agents' },
  { icon: Vote, label: 'Govern', path: '/GovernanceHub' },
  { icon: Wallet, label: 'Wallets', path: '/Wallets' },
  { icon: Shield, label: 'DID', path: '/SovereignID' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const identity = (() => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch (_) { return null; }
  })();
  const isAdmin = hasAdminAccess({ user, identityDid: identity?.did });

  // Only show for admin users
  if (!isAdmin) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 z-50 safe-area-bottom">
      <nav className="flex items-center justify-around px-1 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all min-w-[3.5rem] ${
                active
                  ? 'text-purple-400'
                  : 'text-white/40 active:text-white/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : 'text-white/40'}`} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
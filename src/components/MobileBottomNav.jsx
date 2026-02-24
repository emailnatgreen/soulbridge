import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Wallet, Shield, Users, Menu } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', page: 'Home' },
    { icon: Wallet, label: 'Wallets', page: 'Wallets' },
    { icon: Shield, label: 'DIDs', page: 'DIDManager' },
    { icon: Users, label: 'Network', page: 'DidTrustDashboard' },
  ];

  const isActive = (page) => {
    return location.pathname.includes(page);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <nav className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.page);
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-600'}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
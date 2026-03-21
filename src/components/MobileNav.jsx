import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Home,
  Wallet,
  Shield,
  Award,
  Network,
  Users,
  MessageSquare,
  Settings,
  Menu,
  Bot,
  DollarSign,
  Vote,
  KeyRound
} from 'lucide-react';

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  const navItems = [
    { icon: Home, label: 'Home', page: 'Home' },
    { icon: Wallet, label: 'Wallets', page: 'Wallets' },
    { icon: Shield, label: 'DID Manager', page: 'DIDManager' },
    { icon: Award, label: 'Credentials', page: 'DidCredentials' },
    { icon: Network, label: 'Trust Dashboard', page: 'DidTrustDashboard' },
    { icon: Users, label: 'Connections', page: 'DidConnections' },
    { icon: MessageSquare, label: 'Messages', page: 'DidMessaging' },
    { icon: Bot, label: 'Agents', page: 'Agents' },
    { icon: DollarSign, label: 'RLUSD', page: 'RLUSDManager' },
    { icon: Settings, label: 'Privacy Settings', page: 'DidPrivacy' },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">SoulBridge Village</SheetTitle>
        </SheetHeader>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
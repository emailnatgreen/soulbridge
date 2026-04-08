import React, { useState, useEffect, useCallback } from 'react';
import DIDPresenceBadge from '@/components/global/DIDPresenceBadge';
import KineticPulseIndicator from '@/components/global/KineticPulseIndicator';
import AxiNotificationBell from '@/components/global/AxiNotificationBell';
import { Toaster } from "@/components/ui/sonner";
import GlobalNav from '@/components/GlobalNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import ChatLoader from '@/components/axi/ChatLoader';
import AxiFloatingButton from '@/components/AxiFloatingButtonNew';
import { useAuth } from '@/lib/AuthContext';
import { useIdentity } from '@/hooks/useIdentity';
import AxiChat from '@/components/AxiChat';

// Pages where floating button and chat should NOT appear
const PUBLIC_PAGES = ['EditLanding', 'Terms', 'Support', 'Landing', 'ScrollOfResonance', 'KineticCompass', 'ContactSupport'];

export default function Layout({ children, currentPageName }) {
  const [chatOpen, setChatOpen] = useState(false);
  const { isRecognized, isAdmin, didSignal } = useIdentity();
  const { user } = useAuth();



  const isPublic = PUBLIC_PAGES.includes(currentPageName);

  // Listen for external open-axi events
  const handleOpenAxi = useCallback(() => setChatOpen(true), []);

  useEffect(() => {
    window.addEventListener('open-axi', handleOpenAxi);
    window.addEventListener('open-axi-with-agent', handleOpenAxi);
    window.addEventListener('open-axi-with-message', handleOpenAxi);
    return () => {
      window.removeEventListener('open-axi', handleOpenAxi);
      window.removeEventListener('open-axi-with-agent', handleOpenAxi);
      window.removeEventListener('open-axi-with-message', handleOpenAxi);
    };
  }, [handleOpenAxi]);

  return (
    <div className="relative">
      <GlobalNav />

      {/* Global top bar — DID + Kinetic + Notifications */}
      {isRecognized && !isPublic && (
        <div
          className="fixed top-0 right-0 z-30 flex items-center gap-2 p-2 pr-3 bg-slate-950 border-b border-slate-800"
          style={{ left: isAdmin ? '256px' : 0 }}
        >
          <div className="ml-auto flex items-center gap-2">
            <KineticPulseIndicator />
            <AxiNotificationBell />
            <DIDPresenceBadge />
          </div>
        </div>
      )}

      {/* Background watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url(https://media.base44.com/images/public/699319649276f1077c1f2c81/0d7462541_file_00000000e5c0720aa7cfd4053d3c23d9.png)`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: '420px 420px',
          opacity: 0.06,
        }}
      />

      {/* Page content */}
      <div className={`relative z-10 ${isAdmin ? 'lg:ml-64' : ''} ${isAdmin && !isPublic ? 'pb-16 lg:pb-0' : ''} ${isRecognized && !isPublic ? 'pt-12' : ''}`}>
        {children}
      </div>

      {/* Mobile Bottom Nav — for admin users on non-public pages */}
      {isAdmin && !isPublic && <MobileBottomNav />}

      <Toaster />

      {/* Axi Chat — only for recognized users, not on public pages */}
      {isRecognized && !isPublic && (
        <AxiChat isOpen={chatOpen} setIsOpen={setChatOpen} />
      )}

      {/* Floating Button */}
      <AxiFloatingButton chatOpen={chatOpen} setChatOpen={setChatOpen} currentPageName={currentPageName} />

      {/* ChatLoader for JukeboxDecision events */}
      {isRecognized && <ChatLoader />}
    </div>
  );
}
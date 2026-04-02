import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import GlobalNav from '@/components/GlobalNav';
import ChatLoader from '@/components/axi/ChatLoader';
import { usePageSignal } from '@/hooks/usePageSignal';
import { useIdentity } from '@/hooks/useIdentity';
import AxiFloatingButton from '@/components/AxiFloatingButtonNew';
import IdentityRecognitionModal from '@/components/dashboard/IdentityRecognitionCard';
import { useAuth } from '@/lib/AuthContext';
import { Shield } from 'lucide-react';

const AxiChat = lazy(() => import('@/components/AxiChat'));

// Pages where floating button and chat should NOT appear
const PUBLIC_PAGES = ['EditLanding', 'Terms', 'Support', 'Landing', 'ScrollOfResonance', 'KineticCompass', 'ContactSupport'];

export default function Layout({ children, currentPageName }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const { isRecognized, isAdmin, didSignal } = useIdentity();
  const { user } = useAuth();

  usePageSignal();

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

      {/* Identity Recognition Modal */}
      {isRecognized && (
        <IdentityRecognitionModal user={user} isOpen={identityModalOpen} onClose={() => setIdentityModalOpen(false)} />
      )}

      {/* Identity Recognition Button — floating in bottom right on mobile, header on desktop */}
      {isRecognized && (
        <button
          onClick={() => setIdentityModalOpen(true)}
          className="fixed bottom-40 md:bottom-auto md:top-4 right-4 z-40 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-lg"
          title="View your DIDs and identity"
        >
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Identity</span>
        </button>
      )}

      {/* Page content */}
      <div className={`relative z-10 ${isAdmin ? 'lg:ml-64' : ''}`}>
        {children}
      </div>

      <Toaster />

      {/* Axi Chat — only for recognized users, not on public pages */}
      {isRecognized && !isPublic && (
        <Suspense fallback={null}>
          <AxiChat isOpen={chatOpen} setIsOpen={setChatOpen} />
        </Suspense>
      )}

      {/* Floating Button */}
      <AxiFloatingButton chatOpen={chatOpen} setChatOpen={setChatOpen} currentPageName={currentPageName} />

      {/* ChatLoader for JukeboxDecision events */}
      {isRecognized && <ChatLoader />}
    </div>
  );
}
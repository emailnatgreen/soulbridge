import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from 'lucide-react';
import GlobalNav from '@/components/GlobalNav';
import ChatLoader from '@/components/axi/ChatLoader';
import { usePageSignal } from '@/hooks/usePageSignal';
import { useIdentity } from '@/hooks/useIdentity';
import AxiFloatingButton from '@/components/AxiFloatingButtonNew';

const AxiChat = lazy(() => import('@/components/AxiChat'));
const PUBLIC_PAGES = ['EditLanding', 'Terms', 'Support', 'Landing', 'ScrollOfResonance', 'KineticCompass', 'ContactSupport'];



export default function Layout({ children, currentPageName }) {
  const [chatOpen, setChatOpen] = useState(false);
  const { isRecognized, isAdmin, didSignal } = useIdentity();
  

  
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
          <img
            src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
            alt="SoulBridge"
            className="w-10 h-10 rounded-lg object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />


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

      {/* Page content */}
      <div className={`relative z-10 ${isAdmin ? 'lg:ml-64' : ''}`}>
        {children}
      </div>

      <Toaster />

      {/* Axi Chat — only for recognized users, not on public pages */}
      {recognized && !isPublic && (
        <Suspense fallback={null}>
          <AxiChat isOpen={chatOpen} setIsOpen={setChatOpen} />
        </Suspense>
      )}

      {/* Floating Axi button — hidden when chat is open or on excluded pages */}
      {recognized && !isPublic && !isNoFloat && !chatOpen && (
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[10001]">
          <button
            onClick={() => setChatOpen(true)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-transform hover:scale-110 active:scale-95 relative ${showAdminSidebar ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-amber-300/30' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-purple-400/30'}`}
            title={showAdminSidebar ? 'Open your admin Axi (DID: ' + (didSignal?.did?.slice(0, 10) || 'pending') + '...) ' + (walletUpdating ? '📊 Updating' : '') : 'Open your personal Axi'}
          >
            {showAdminSidebar ? <Shield className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
            {/* DID verification indicator badge on button */}
            {walletUpdating ? (
              <Circle className="w-3 h-3 bg-blue-400 fill-blue-400 absolute bottom-0 right-0 rounded-full border border-white animate-pulse" />
            ) : didSignal?.loading ? (
              <Circle className="w-3 h-3 bg-yellow-400 fill-yellow-400 absolute bottom-0 right-0 rounded-full border border-white animate-pulse" />
            ) : !didSignal?.loading && didSignal?.isVerified ? (
              <Circle className="w-3 h-3 bg-green-400 fill-green-400 absolute bottom-0 right-0 rounded-full border border-white" />
            ) : (
              <Circle className="w-3 h-3 bg-red-400 fill-red-400 absolute bottom-0 right-0 rounded-full border border-white" />
            )}
          </button>
        </div>
      )}

      {/* ChatLoader for JukeboxDecision events */}
      {isRecognized && <ChatLoader />}
    </div>
  );
}
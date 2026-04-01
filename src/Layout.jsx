import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from 'lucide-react';
import GlobalNav from '@/components/GlobalNav';
import ChatLoader from '@/components/axi/ChatLoader';
import { usePageSignal } from '@/hooks/usePageSignal';
import { useAuth } from '@/lib/AuthContext';
import { hasAdminAccess } from '@/lib/adminAccess';

const AxiChat = lazy(() => import('@/components/AxiChat'));

// Pages where floating button and chat should NOT appear
const PUBLIC_PAGES = ['EditLanding', 'Terms', 'Support', 'Landing', 'ScrollOfResonance', 'KineticCompass', 'ContactSupport'];
const NO_FLOAT_PAGES = ['Axi', 'MentorshipHub', 'ScrollOfResonance', 'KineticCompass'];

function isRecognizedUser(isAuthenticated) {
  if (isAuthenticated) return true;
  if (localStorage.getItem('base44_access_token') || localStorage.getItem('token')) return true;
  try {
    const id = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
    if (id?.did || id?.connected) return true;
  } catch (_) {}
  return false;
}

export default function Layout({ children, currentPageName }) {
  const [chatOpen, setChatOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  usePageSignal();

  const isPublic = PUBLIC_PAGES.includes(currentPageName);
  const isNoFloat = NO_FLOAT_PAGES.includes(currentPageName);

  const identity = (() => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); }
    catch (_) { return null; }
  })();

  const recognized = isRecognizedUser(isAuthenticated);
  const showAdminSidebar = recognized && hasAdminAccess({ user, identityDid: identity?.did });

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
      {/* Mobile logo */}
      {!isPublic && (
        <div className="fixed top-0 left-0 z-50 p-3 md:hidden">
          <img
            src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
            alt="SoulBridge"
            className="w-10 h-10 rounded-lg object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      )}

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
      <div className={`relative z-10 ${showAdminSidebar ? 'lg:ml-64' : ''}`}>
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
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex items-center justify-center shadow-2xl border border-purple-400/30 transition-transform hover:scale-110 active:scale-95"
          title="Talk to Axi"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>
      )}

      {/* ChatLoader for JukeboxDecision events */}
      {recognized && <ChatLoader />}
    </div>
  );
}
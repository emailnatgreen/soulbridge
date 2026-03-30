import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';

import GlobalNav from '@/components/GlobalNav';
import ChatLoader from '@/components/axi/ChatLoader';
import { usePageSignal } from '@/hooks/usePageSignal';
import { useAuth } from '@/lib/AuthContext';
import { hasAdminAccess } from '@/lib/adminAccess';

const AxiChat = lazy(() => import('@/components/AxiChat'));

// Pages where Talk to Axi should NOT appear (public/landing pages)
const PUBLIC_PAGES = ['EditLanding', 'Terms', 'Support'];

// Pages where the floating Axi button should be hidden
const NO_FLOAT_PAGES = ['Axi', 'MentorshipHub', 'ScrollOfResonance', 'KineticCompass'];
// Pages where AxiChat panel itself should not render
const NO_CHAT_PAGES = ['Axi', 'MentorshipHub'];

export default function Layout({ children, currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [prefilledAxiMessage, setPrefilledAxiMessage] = useState(null);
  const [speakerAgentId, setSpeakerAgentId] = useState(null);
  const { user, isAuthenticated } = useAuth();

  // Trigger comprehensive page signal for Jukebox Brain
  usePageSignal();

  const isPublicPage = PUBLIC_PAGES.includes(currentPageName);
  const isNoFloatPage = NO_FLOAT_PAGES.includes(currentPageName);
  const identity = (() => {
    try {
      return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
    } catch (_) {
      return null;
    }
  })();
  const showAdminSidebar = isAuthenticated && hasAdminAccess({ user, identityDid: identity?.did });

  const handleToggle = () => {
    if (!everOpened) setEverOpened(true);
    setIsOpen(prev => !prev);
    if (prefilledAxiMessage) {
      setPrefilledAxiMessage(null);
    }
  };

  const handleOpenAxi = useCallback((event) => {
    if (!everOpened) setEverOpened(true);
    setIsOpen(true);
    if (event.detail?.message) {
      setPrefilledAxiMessage(event.detail.message);
    }
    if (event.detail?.agentId) {
      setSpeakerAgentId(event.detail.agentId);
    }
  }, [everOpened]);

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
      {/* Logo and branding in top-left, visible across all pages */}
      <div className="fixed top-0 left-0 z-50 p-3 md:hidden">
        <img
          src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
          alt="SoulBridge"
          className="w-10 h-10 rounded-lg object-contain"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>
      <GlobalNav />
      
      {/* Global Background Watermark */}
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
      {/* Page Content */}
      <div className={`relative z-10 ${showAdminSidebar ? 'lg:ml-64' : ''}`}>
        {children}
      </div>

      <Toaster />

      {/* AxiChat for authenticated users */}
      {isAuthenticated && !isPublicPage && !NO_CHAT_PAGES.includes(currentPageName) && (
        <Suspense fallback={null}>
          <AxiChat 
            isOpen={isOpen} 
            setIsOpen={setIsOpen} 
            prefilledMessage={prefilledAxiMessage}
            onMessageCleared={() => setPrefilledAxiMessage(null)}
            speakerAgentId={speakerAgentId}
            onSpeakerAgentCleared={() => setSpeakerAgentId(null)}
          />
        </Suspense>
      )}

      {/* Floating Axi button for authenticated users */}
      {isAuthenticated && !isPublicPage && !isNoFloatPage && (
        <button
          onClick={handleToggle}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex items-center justify-center shadow-2xl border border-purple-400/30 transition-transform hover:scale-110 active:scale-95"
          title="Talk to Axi"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>
      )}

      {/* ChatLoader — listens for JukeboxDecision events */}
      {isAuthenticated && <ChatLoader />}
    </div>
  );
}
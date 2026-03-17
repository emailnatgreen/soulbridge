import React, { useState, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';
import FloatingConnectButton from '@/components/FloatingConnectButton';
import GlobalNav from '@/components/GlobalNav';

const AxiChat = lazy(() => import('@/components/AxiChat'));

// Pages where Talk to Axi should NOT appear (public/landing pages)
const PUBLIC_PAGES = ['Landing', 'EditLanding', 'Terms', 'Support'];

// Pages where the floating Axi button should be hidden (has its own full chat UI)
const NO_FLOAT_PAGES = ['Axi'];

export default function Layout({ children, currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  const isPublicPage = PUBLIC_PAGES.includes(currentPageName);

  const handleToggle = () => {
    if (!everOpened) setEverOpened(true);
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    const handleOpenAxi = () => {
      if (!everOpened) setEverOpened(true);
      setIsOpen(true);
    };
    window.addEventListener('open-axi-with-agent', handleOpenAxi);
    return () => window.removeEventListener('open-axi-with-agent', handleOpenAxi);
  }, [everOpened]);

  return (
    <div className="relative">
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
      <div className="relative z-10 lg:ml-64">
        {children}
      </div>

      <Toaster />

      {/* Floating Connect Button — hidden on pages with their own chat UI */}
      {!NO_FLOAT_PAGES.includes(currentPageName) && <FloatingConnectButton />}

      {/* Only mount AxiChat on non-public pages and after first open */}
      {!isPublicPage && everOpened && (
        <Suspense fallback={null}>
          <AxiChat isOpen={isOpen} setIsOpen={setIsOpen} />
        </Suspense>
      )}
    </div>
  );
}
import React, { useState, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';

const AxiChat = lazy(() => import('@/components/AxiChat'));

// Pages where Talk to Axi should NOT appear (public/landing pages)
const PUBLIC_PAGES = ['Landing', 'EditLanding', 'Terms', 'Support'];

export default function Layout({ children, currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  const isPublicPage = PUBLIC_PAGES.includes(currentPageName);

  const handleToggle = () => {
    if (!everOpened) setEverOpened(true);
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative">
      {/* Global Top Bar - only on non-public pages */}
      {!isPublicPage && currentPageName && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end">
          <Button
            onClick={handleToggle}
            size="sm"
            className={`gap-2 transition-all ${isOpen 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-purple-100 hover:bg-purple-200 text-purple-700 hover:text-purple-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Talk to Axi</span>
          </Button>
        </div>
      )}

      {/* Page Content */}
      <div className={!isPublicPage ? "pt-10" : ""}>
        {children}
      </div>

      <Toaster />

      {/* Only mount AxiChat on non-public pages and after first open */}
      {!isPublicPage && everOpened && (
        <Suspense fallback={null}>
          <AxiChat isOpen={isOpen} setIsOpen={setIsOpen} />
        </Suspense>
      )}
    </div>
  );
}
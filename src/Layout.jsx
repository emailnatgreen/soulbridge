import React, { useState, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';
import AxiFloatingButton from '@/components/AxiFloatingButton';

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
      {/* Page Content */}
      <div>
        {children}
      </div>

      <Toaster />

      {/* Floating Axi Button for all pages */}
      <AxiFloatingButton />

      {/* Only mount AxiChat on non-public pages and after first open */}
      {!isPublicPage && everOpened && (
        <Suspense fallback={null}>
          <AxiChat isOpen={isOpen} setIsOpen={setIsOpen} />
        </Suspense>
      )}
    </div>
  );
}
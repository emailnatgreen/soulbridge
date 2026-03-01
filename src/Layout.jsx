import React, { useState, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';
import LondonClock from '@/components/LondonClock';

const AxiChat = lazy(() => import('@/components/AxiChat'));

export default function Layout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  const handleToggle = () => {
    if (!everOpened) setEverOpened(true);
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative">
      {/* Global Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <LondonClock />
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

      {/* Page Content - offset for top bar */}
      <div className="pt-10">
        {children}
      </div>

      <Toaster />

      {/* Only mount AxiChat after first open */}
      {everOpened && (
        <Suspense fallback={null}>
          <AxiChat isOpen={isOpen} setIsOpen={setIsOpen} />
        </Suspense>
      )}
    </div>
  );
}
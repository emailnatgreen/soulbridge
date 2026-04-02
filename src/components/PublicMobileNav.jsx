import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogIn, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicMobileNav() {
  const [didConnected, setDidConnected] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const identity = JSON.parse(stored);
        setDidConnected(identity);
      }
    } catch (e) {}

    // Listen for validation
    const handleValidated = () => {
      try {
        const stored = localStorage.getItem('soulbridge_identity');
        if (stored) {
          const identity = JSON.parse(stored);
          setDidConnected({ ...identity, validated: true });
        }
      } catch (e) {}
    };
    window.addEventListener('did-validated', handleValidated);
    return () => window.removeEventListener('did-validated', handleValidated);
  }, []);

  return (
    <div className="sticky top-0 z-[100] bg-slate-900/95 backdrop-blur-lg border-b border-white/10 px-4 py-2 flex items-center justify-between"
         style={{ pointerEvents: 'auto' }}>
      <a
        href="/"
        className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors no-underline"
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 101 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </a>

      {/* Mobile action buttons */}
      {didConnected?.validated && (
        <Button
          onClick={() => {
            setIsNavigating(true);
            setTimeout(() => window.location.href = '/dashboard', 800);
          }}
          disabled={isNavigating}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 px-3 text-xs gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNavigating ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-3 h-3" />
              Enter
            </>
          )}
        </Button>
      )}
    </div>
  );
}
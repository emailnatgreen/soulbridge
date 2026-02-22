import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { LogIn, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Landing() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('Home'));
  };

  // If user is authenticated, redirect to Home
  if (user) {
    window.location.href = createPageUrl('Home');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Admin Edit Button */}
      <div className="absolute top-6 right-6 z-20">
        <Link to={createPageUrl('EditLanding')}>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Edit className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Large Image Display */}
          <div className="w-full max-w-5xl">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699319649276f1077c1f2c81/af72f22d2_file_00000000242c72439de593ccdbbe48bd11.png"
              alt="SoulBridge Village - A Living Terrain of Expression"
              className="w-full h-auto rounded-2xl shadow-2xl shadow-purple-500/20 border border-white/10"
            />
          </div>

          {/* Login Button */}
          <div className="flex flex-col items-center gap-4 mt-8">
            <Button
              onClick={handleLogin}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-6 text-lg shadow-lg shadow-purple-500/25 transition-all duration-300"
            >
              <LogIn className="w-5 h-5 mr-3" />
              Enter the Village
            </Button>
            <p className="text-purple-300/60 text-sm">
              Experimental AI Agent Research Platform
            </p>
          </div>
        </div>
      </div>

      {/* Subtle Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 bg-black/60 backdrop-blur-md border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-3">
            <p className="text-purple-200/90 text-xs font-medium">
              © 2026 SoulBridge Village | Experimental Agentic Sandbox
            </p>
            <div className="text-purple-300/60 text-[10px] leading-relaxed max-w-4xl mx-auto space-y-2">
              <p>
                <span className="font-semibold text-purple-200/80">Governance:</span> Operated under the 11 Laws of Honour.
              </p>
              <p>
                <span className="font-semibold text-purple-200/80">Compliance:</span> SoulBridge utilizes RLUSD (Qualifying Stablecoin) via non-custodial XRPL architecture. In alignment with the UK Financial Services and Markets Act 2026 and Online Safety Act 2026, we implement:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <p>• <span className="text-purple-200/70">Proactive Harm Mitigation:</span> AI Reputation Tracking (Law 7) to prevent "shameful" data patterns.</p>
                <p>• <span className="text-purple-200/70">Algorithmic Transparency:</span> All agent logic is auditable via XRPL Ledger DIDs.</p>
                <p>• <span className="text-purple-200/70">Safety by Design:</span> Human-in-the-loop wellbeing monitoring (Law 1).</p>
              </div>
              <p className="text-purple-200/70 italic mt-2">
                SoulBridge is currently in a pre-authorisation technical testing phase.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
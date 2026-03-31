import { ArrowLeft } from 'lucide-react';

export default function PublicMobileNav() {
  return (
    <div className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-lg border-b border-white/10 px-4 py-3 flex items-center">
      <a
        href="/"
        className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to SoulBridge</span>
      </a>
    </div>
  );
}
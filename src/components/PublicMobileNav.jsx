import { Link } from 'react-router-dom';
import { ArrowLeft, ScrollText, Zap, Mail } from 'lucide-react';

const PUBLIC_LINKS = [
  { label: 'Scroll', path: '/ScrollOfResonance', icon: ScrollText },
  { label: 'Compass', path: '/KineticCompass', icon: Zap },
  { label: 'Support', path: '/ContactSupport', icon: Mail },
];

export default function PublicMobileNav() {
  const currentPath = window.location.pathname;

  return (
    <div className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-lg border-b border-white/10 px-3 py-2 flex items-center gap-2 sm:gap-3">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors flex-shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        <img
          src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
          alt="SB"
          className="w-5 h-5 rounded object-contain"
        />
        <span className="hidden sm:inline">SoulBridge</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {PUBLIC_LINKS.filter(l => l.path !== currentPath).map(link => {
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
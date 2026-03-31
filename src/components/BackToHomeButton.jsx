import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BackToHomeButton({ variant = 'dark' }) {
  const isDark = variant === 'dark';
  return (
    <Link to="/Home">
      <Button
        variant="ghost"
        size="sm"
        className={isDark
          ? 'text-purple-300 hover:text-purple-200 hover:bg-white/10 gap-1.5'
          : 'text-gray-600 hover:text-gray-900 gap-1.5'
        }
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Button>
    </Link>
  );
}
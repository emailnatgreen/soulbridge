import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Shield, LogOut, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function DidAuthStatus() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const loadSession = () => {
      try {
        const stored = localStorage.getItem('did_auth_session');
        if (stored) {
          setSession(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      }
    };

    loadSession();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadSession, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('did_auth_session');
    setSession(null);
    toast.success('Logged out successfully');
    navigate(createPageUrl('Home'));
  };

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(createPageUrl('DidLogin'))}
        className="gap-2"
      >
        <Shield className="w-4 h-4" />
        Login with DID
      </Button>
    );
  }

  const authenticatedAt = new Date(session.authenticated_at);
  const timeAgo = Math.floor((new Date() - authenticatedAt) / (1000 * 60)); // minutes

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="hidden sm:inline">DID Authenticated</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h4 className="font-semibold">DID Session</h4>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600 mb-1">DID Address:</div>
              <div className="font-mono text-xs break-all">{session.did}</div>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                Authenticated {timeAgo === 0 ? 'just now' : `${timeAgo} min ago`}
              </span>
            </div>

            <Badge className="bg-green-100 text-green-800">
              Active Session
            </Badge>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
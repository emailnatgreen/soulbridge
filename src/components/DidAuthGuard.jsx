import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function DidAuthGuard({ children, requireDID = true, fallback = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const session = localStorage.getItem('did_auth_session');
        if (session) {
          const parsed = JSON.parse(session);
          // Check if session is valid (not expired)
          const authenticatedAt = new Date(parsed.authenticated_at);
          const now = new Date();
          const hoursSinceAuth = (now - authenticatedAt) / (1000 * 60 * 60);
          
          if (hoursSinceAuth < 24) { // 24 hour session
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('did_auth_session');
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-indigo-600 animate-pulse" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!requireDID) {
    return children;
  }

  if (!isAuthenticated) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-block p-4 bg-indigo-100 rounded-full mb-4">
                <Lock className="w-12 h-12 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                DID Authentication Required
              </h2>
              <p className="text-gray-600 mb-6">
                This resource requires authentication with a Decentralized Identity (DID)
              </p>
              <Button
                onClick={() => navigate(createPageUrl('DidLogin'), { 
                  state: { from: location } 
                })}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                <Shield className="w-5 h-5 mr-2" />
                Login with DID
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <div className="mt-4 text-sm text-gray-500">
                Don't have a DID?{' '}
                <button
                  onClick={() => navigate(createPageUrl('CreateDID'))}
                  className="text-indigo-600 hover:underline"
                >
                  Create one here
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
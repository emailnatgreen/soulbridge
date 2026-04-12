import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ArrowLeft } from 'lucide-react';
import Dashboard from './Dashboard';

// ── This page is admin-only — renders the actual live Dashboard (View 4: Published Member) ──

// Simulates a published member identity to trigger Dashboard View 4
const MOCK_IDENTITY = {
  did: 'did:xrpl:1:rNewMember9xSoulBridge1234567890',
  connected: true,
  validated: true,
  published: true,
};

export default function UserDashboardPreview() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate a published member in localStorage so Dashboard renders View 4
    localStorage.setItem('soulbridge_identity', JSON.stringify(MOCK_IDENTITY));
    window.__soulbridge = window.__soulbridge || {};
    window.__soulbridge.identity = MOCK_IDENTITY;
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Admin notice bar — overlaid on top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center gap-3">
        <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-amber-300 text-xs font-semibold">
          Admin Preview — This is the <span className="underline">live Dashboard (View 4)</span> as a published member sees it. Real data from your Village.
        </p>
        <Link to="/home" className="ml-auto flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs border border-amber-500/40 rounded-lg px-2.5 py-1 transition flex-shrink-0">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
      </div>

      {/* Dashboard View 4 — published member */}
      <div className="pt-10">
        <Dashboard />
      </div>
    </div>
  );
}
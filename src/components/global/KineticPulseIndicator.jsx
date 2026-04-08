import React, { useState, useEffect, useRef } from 'react';
import { Zap, TrendingUp, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export default function KineticPulseIndicator() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, recent: 0, health: 'nominal' });
  const [recentKUs, setRecentKUs] = useState([]);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = 10;

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(168,85,247,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spinning arc
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle, angle + Math.PI * 0.7);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = stats.health === 'critical' ? '#ef4444' : stats.health === 'low' ? '#f59e0b' : '#a855f7';
      ctx.fill();

      angle += 0.04;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [stats.health]);

  const loadStats = async () => {
    try {
      const kus = await base44.entities.KineticUnit.list('-created_date', 20);
      const total = kus.length;
      const oneDayAgo = Date.now() - 86400000;
      const recent = kus.filter(k => new Date(k.created_date).getTime() > oneDayAgo).length;
      const health = recent === 0 ? 'critical' : recent < 3 ? 'low' : 'nominal';
      setStats({ total, recent, health });
      setRecentKUs(kus.slice(0, 5));
    } catch (_) {}
  };

  const healthColor = stats.health === 'critical' ? 'text-red-400' : stats.health === 'low' ? 'text-amber-400' : 'text-purple-400';
  const healthLabel = stats.health === 'critical' ? 'Critical' : stats.health === 'low' ? 'Low Activity' : 'Nominal';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 transition-all"
        title="Kinetic Grid Pulse"
      >
        <canvas ref={canvasRef} width={24} height={24} className="flex-shrink-0" />
        <span className={`text-xs font-mono hidden sm:block ${healthColor}`}>{stats.recent} KU</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 z-50 w-72 bg-slate-900 border border-purple-500/30 rounded-xl p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm font-semibold">Kinetic Grid</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  stats.health === 'critical' ? 'border-red-500/40 bg-red-900/20 text-red-400' :
                  stats.health === 'low' ? 'border-amber-500/40 bg-amber-900/20 text-amber-400' :
                  'border-purple-500/40 bg-purple-900/20 text-purple-400'
                }`}>{healthLabel}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black/20 rounded-lg p-2 text-center">
                  <p className="text-purple-300 text-lg font-bold">{stats.recent}</p>
                  <p className="text-slate-400 text-xs">Last 24h KUs</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2 text-center">
                  <p className="text-purple-300 text-lg font-bold">{stats.total}</p>
                  <p className="text-slate-400 text-xs">Total KUs</p>
                </div>
              </div>

              {recentKUs.length > 0 && (
                <div className="mb-3">
                  <p className="text-slate-400 text-xs mb-2">Recent Activity</p>
                  <div className="space-y-1">
                    {recentKUs.map((ku, i) => (
                      <div key={ku.id || i} className="flex items-center gap-2 text-xs">
                        <Activity className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="text-slate-300 truncate">{ku.ku_type || 'Unknown'}</span>
                        <span className="text-purple-400 ml-auto font-mono">{ku.weighted_score || 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                to="/KineticGridDashboard"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-purple-800/40 hover:bg-purple-800/60 text-purple-300 text-xs transition-all"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Open Kinetic Grid
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
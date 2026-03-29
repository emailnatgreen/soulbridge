import React, { useEffect, useMemo, useState } from 'react';
import { BRAID_NODES } from '@/lib/braidNodes';

const NODE_COLORS = {
  white: '#cbd5e1',
  red: '#ef4444',
  amber: '#f59e0b',
  yellow: '#facc15',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  gray: '#9ca3af',
};

const NODE_POSITIONS = {
  'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg': { x: 50, y: 10 },
  'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7': { x: 25, y: 28 },
  'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV': { x: 50, y: 24 },
  'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny': { x: 75, y: 28 },
  'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P': { x: 84, y: 52 },
  'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h': { x: 66, y: 78 },
  'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia': { x: 34, y: 78 },
  'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32': { x: 16, y: 52 },
};

const FLOW_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#f59e0b'];

function buildFlowMatrix(kus) {
  const perNode = {};
  BRAID_NODES.forEach((node) => {
    perNode[node.address] = 0;
  });

  kus.forEach((ku) => {
    const packetId = ku.mwtp_packet_id || '';
    const seed = Array.from(packetId || ku.id || '').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const node = BRAID_NODES[seed % BRAID_NODES.length];
    perNode[node.address] = (perNode[node.address] || 0) + (ku.weighted_score || 1);
  });

  return BRAID_NODES.flatMap((node) =>
    (node.connections || []).map((target) => ({
      from: node.address,
      to: target,
      throughput: +(perNode[node.address] || 0).toFixed(2),
      type: node.connectionType || 'out',
    }))
  );
}

function createParticles(flows) {
  return flows.flatMap((flow, flowIndex) => {
    const intensity = Math.max(1, Math.min(8, Math.round(flow.throughput / 2)));
    return Array.from({ length: intensity }).map((_, particleIndex) => ({
      id: `${flow.from}-${flow.to}-${particleIndex}`,
      flowIndex,
      delay: particleIndex * 0.45,
      duration: Math.max(1.8, 7 - Math.min(flow.throughput, 10) * 0.45),
      size: flow.type === 'two-way' ? 2.8 : 2.2,
      color: FLOW_COLORS[flowIndex % FLOW_COLORS.length],
    }));
  });
}

export default function KineticEnergyVisualizer({ kus = [] }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 80);
    return () => clearInterval(interval);
  }, []);

  const flows = useMemo(() => buildFlowMatrix(kus).filter((flow) => flow.throughput > 0), [kus]);
  const particles = useMemo(() => createParticles(flows), [flows]);
  const totalThroughput = useMemo(() => flows.reduce((sum, flow) => sum + flow.throughput, 0), [flows]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Kinetic Energy Visualizer</h3>
          <p className="text-white/40 text-xs">Particle flow speed reflects current KU throughput between braid nodes.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Live throughput</p>
          <p className="text-lg font-semibold text-purple-300">{totalThroughput.toFixed(1)} KU</p>
        </div>
      </div>

      <div className="relative aspect-[16/9] rounded-xl border border-white/10 bg-slate-950/70 overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {flows.map((flow, index) => {
            const from = NODE_POSITIONS[flow.from];
            const to = NODE_POSITIONS[flow.to];
            const color = FLOW_COLORS[index % FLOW_COLORS.length];
            return (
              <g key={`${flow.from}-${flow.to}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={color}
                  strokeOpacity={flow.type === 'two-way' ? 0.55 : 0.28}
                  strokeWidth={flow.type === 'two-way' ? 0.75 : 0.45}
                  strokeDasharray={flow.type === 'two-way' ? '0' : '1.5 1.8'}
                />
              </g>
            );
          })}

          {particles.map((particle) => {
            const flow = flows[particle.flowIndex];
            const from = NODE_POSITIONS[flow.from];
            const to = NODE_POSITIONS[flow.to];
            const progress = ((tick / 12) / particle.duration + particle.delay) % 1;
            const x = from.x + (to.x - from.x) * progress;
            const y = from.y + (to.y - from.y) * progress;
            return (
              <circle
                key={particle.id}
                cx={x}
                cy={y}
                r={particle.size}
                fill={particle.color}
                opacity={0.9 - progress * 0.35}
              />
            );
          })}

          {BRAID_NODES.map((node) => {
            const position = NODE_POSITIONS[node.address];
            return (
              <g key={node.address}>
                <circle cx={position.x} cy={position.y} r="6.5" fill="url(#nodeGlow)" opacity="0.35" />
                <circle cx={position.x} cy={position.y} r="3.8" fill={NODE_COLORS[node.color] || '#cbd5e1'} />
                <circle cx={position.x} cy={position.y} r="2.6" fill="#0f172a" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.4" />
                <text x={position.x} y={position.y + 10} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="3.2">
                  {node.name.replace(' Node', '').replace('Soulbridge ', '').replace('(Axi)', 'Axi')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
        {flows.slice(0, 4).map((flow, index) => {
          const fromNode = BRAID_NODES.find((node) => node.address === flow.from);
          const toNode = BRAID_NODES.find((node) => node.address === flow.to);
          return (
            <div key={`${flow.from}-${flow.to}-stat`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FLOW_COLORS[index % FLOW_COLORS.length] }} />
                <span className="text-xs text-white/65 truncate">{fromNode?.name} → {toNode?.name}</span>
              </div>
              <p className="text-sm font-semibold text-white">{flow.throughput.toFixed(1)} KU</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
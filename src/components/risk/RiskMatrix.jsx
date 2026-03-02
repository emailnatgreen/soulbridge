import React from 'react';

const SEVERITY = ['Low', 'Medium', 'High', 'Critical'];
const LIKELIHOOD = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

function cellColor(s, l) {
  const score = (SEVERITY.indexOf(s) + 1) * (LIKELIHOOD.indexOf(l) + 1);
  if (score >= 16) return 'bg-red-500 text-white';
  if (score >= 9) return 'bg-orange-400 text-white';
  if (score >= 4) return 'bg-yellow-300 text-gray-900';
  return 'bg-green-200 text-gray-800';
}

export default function RiskMatrix({ risks = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs w-full">
        <thead>
          <tr>
            <th className="p-2 text-gray-500 text-left">Likelihood ↓ / Severity →</th>
            {SEVERITY.map(s => (
              <th key={s} className="p-2 text-center text-gray-700 font-semibold">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...LIKELIHOOD].reverse().map(l => (
            <tr key={l}>
              <td className="p-2 text-gray-700 font-semibold whitespace-nowrap">{l}</td>
              {SEVERITY.map(s => {
                const matching = risks.filter(r => r.severity === s && r.likelihood === l);
                return (
                  <td key={s} className={`p-2 text-center border border-white/50 ${cellColor(s, l)} min-w-[80px]`}>
                    {matching.length > 0 && (
                      <span className="font-bold text-sm">{matching.length}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block"/> Low</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 inline-block"/> Medium</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block"/> High</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"/> Critical</span>
      </div>
    </div>
  );
}
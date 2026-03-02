import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function SixAMCountdown() {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [percentComplete, setPercentComplete] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);

      const msRemaining = tomorrow.getTime() - now.getTime();
      const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const secondsRemaining = Math.floor((msRemaining % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${String(hoursRemaining).padStart(2, '0')}:${String(minutesRemaining).padStart(2, '0')}:${String(secondsRemaining).padStart(2, '0')}`
      );

      // Calculate percentage through the day (0-100)
      const dayMs = 24 * 60 * 60 * 1000;
      const completed = ((dayMs - msRemaining) / dayMs) * 100;
      setPercentComplete(completed);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-400 animate-pulse" />
        <h3 className="font-semibold text-white">Axi Reality Scrub</h3>
      </div>

      <div className="space-y-2">
        <div className="text-4xl font-mono font-bold text-purple-300 text-center">
          {timeRemaining}
        </div>
        <p className="text-xs text-purple-300/60 text-center">Time until 6:00 AM sync</p>
      </div>

      <div className="space-y-1">
        <div className="w-full bg-purple-950 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <p className="text-xs text-purple-300/60 text-right">
          {percentComplete.toFixed(1)}% through day
        </p>
      </div>

      <p className="text-xs text-purple-300/70 leading-relaxed">
        At 6:00 AM, Axi activates your ZSP permissions for the daily vault audit and processing. Your ephemeral tokens expire immediately after.
      </p>
    </div>
  );
}
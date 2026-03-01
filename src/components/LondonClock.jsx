import React, { useState, useEffect } from 'react';

export default function LondonClock() {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const formatted = now.toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setTimeStr(formatted);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-xs font-mono text-gray-700 hidden lg:block whitespace-nowrap">
      {timeStr}
    </span>
  );
}
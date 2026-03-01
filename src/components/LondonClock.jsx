import React, { useState, useEffect, memo } from 'react';

const fmt = new Intl.DateTimeFormat('en-GB', {
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

const LondonClock = memo(function LondonClock() {
  const [timeStr, setTimeStr] = useState(() => fmt.format(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTimeStr(fmt.format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-xs font-mono text-gray-700 hidden lg:block whitespace-nowrap">
      {timeStr}
    </span>
  );
});

export default LondonClock;
import React, { useState, useEffect } from 'react';

const TimeDisplay: React.FC = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    // Independent timer only for this component
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const dateLabel = date
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="bg-black/30 border-4 border-white/15 rounded-lg px-8 py-2">
        <h1
          className="text-[7rem] md:text-[9rem] font-vcr text-white leading-none select-none flex items-center"
          style={{ textShadow: '0 0 12px rgba(255,255,255,0.55)' }}
        >
          <span>{hh}</span>
          <span className="animate-pulse-slow px-1">:</span>
          <span>{mm}</span>
        </h1>
      </div>
      <p className="text-lg md:text-xl font-vcr text-neon-blue tracking-widest mt-2">
        {dateLabel}
      </p>
    </div>
  );
};

export default TimeDisplay;

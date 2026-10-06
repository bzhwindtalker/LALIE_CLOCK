import React, { useMemo } from 'react';
import { ClockState, WeatherData } from '../types';
import WeatherOverlay from './WeatherOverlay';

interface WaveBackgroundProps {
  clockState: ClockState;
  weather: WeatherData | null;
}

// --- tiny pixel-art celestial sprites (char grids, painted as SVG rects) ---
const SUN_GRID = [
  '....O....',
  '.O..O..O.',
  '..OOOOO..',
  '.OOYYYOO.',
  'OOYYYYYOO',
  '.OOYYYOO.',
  '..OOOOO..',
  '.O..O..O.',
  '....O....',
];

const MOON_GRID = [
  '...WWW...',
  '.WWWWWWW.',
  'WWWWWWWWW',
  'WWWWWWWWW',
  'WWWWWWWWW',
  'WWWWWWWWW',
  'WWWWWWWWW',
  '.WWWWWWW.',
  '...WWW...',
];

const PixelSprite: React.FC<{ grid: string[]; colors: Record<string, string>; shadowSide?: 'left' | 'right'; shadowWidth?: number }> =
({ grid, colors, shadowSide, shadowWidth }) => {
  const rects: React.ReactNode[] = [];
  grid.forEach((row, y) => {
    const cellColor = (x: number) => {
      const ch = row[x];
      if (ch === '.') return null;
      const inShadow = shadowWidth && shadowSide === 'left' ? x < shadowWidth
                     : shadowWidth && shadowSide === 'right' ? x >= row.length - shadowWidth
                     : false;
      return inShadow ? '#1a1523' : (colors[ch] || '#fff');
    };
    let x = 0;
    while (x < row.length) {
      const col = cellColor(x);
      if (!col) { x++; continue; }
      let run = 1;
      while (x + run < row.length && cellColor(x + run) === col) run++;
      rects.push(<rect key={`r${x}-${y}`} x={x} y={y} width={run} height={1} fill={col} />);
      x += run;
    }
  });
  return (
    <svg viewBox={`0 0 ${grid[0].length} ${grid.length}`} className="w-full h-full shape-rendering-crispEdges">
      {rects}
    </svg>
  );
};

// deterministic pseudo-random (stable across renders — the old Math.random stars flickered on re-render)
const seeded = (i: number, salt: number) => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const WaveBackground: React.FC<WaveBackgroundProps> = React.memo(({ clockState, weather }) => {

  // 1. Base Gradient Config (Dictated by App State for Sleep Training)
  const getGradientConfig = () => {
    switch (clockState) {
      case ClockState.SLEEP:
        return { start: '#020024', mid: '#090979', end: '#000000', hill1: '#2b1a5e', hill2: '#160d33', wave: '#4B0082' };
      case ClockState.NAP:
        return { start: '#1e3a8a', mid: '#3b82f6', end: '#93c5fd', hill1: '#2d5aa8', hill2: '#1e3a6d', wave: '#bfdbfe' };
      case ClockState.STORY:
        return { start: '#4a044e', mid: '#a21caf', end: '#fb923c', hill1: '#6b1f63', hill2: '#3d1238', wave: '#fdba74' };
      case ClockState.QUIET:
        return { start: '#451e3e', mid: '#651e3e', end: '#851e3e', hill1: '#5c2a4f', hill2: '#33172c', wave: '#FFA07A' };
      case ClockState.WAKE:
        return { start: '#164e63', mid: '#115e59', end: '#581c87', hill1: '#0f766e', hill2: '#134e4a', wave: '#7FFFD4' };
      default:
        return { start: '#000', mid: '#111', end: '#222', hill1: '#333', hill2: '#222', wave: '#444' };
    }
  };

  const colors = getGradientConfig();

  // 2. Astronomical Position Calculation
  const now = new Date();

  let sunY = 150; // Off screen
  let sunX = 50;
  let moonY = 150;
  let moonX = 50;
  let phase = 0.5; // Full

  if (weather) {
      const { sunrise, sunset, moonPhase } = weather;
      phase = moonPhase;

      const nowTs = now.getTime();
      const riseTs = sunrise.getTime();
      const setTs = sunset.getTime();

      if (nowTs >= riseTs && nowTs <= setTs) {
          const totalDay = setTs - riseTs;
          const progress = (nowTs - riseTs) / totalDay;
          sunX = progress * 100;
          const arc = Math.pow((progress - 0.5) * 2, 2);
          sunY = 10 + (arc * 100);
      } else {
          sunY = 150;
      }

      if (sunY > 100) {
          moonX = (now.getHours() * 60 + now.getMinutes()) / 1440 * 100;
          moonY = 14;
      } else {
          moonY = 150;
      }
  } else {
      const hour = now.getHours();
      if (hour > 6 && hour < 18) {
          sunY = 14; sunX = ((hour - 6) / 12) * 100;
          moonY = 150;
      } else {
          sunY = 150;
          moonY = 14; moonX = 50;
      }
  }

  // Moon phase shadow: 0 columns dark at full moon, 9 at new moon
  const visiblePercent = 1 - Math.abs((phase - 0.5) * 2);
  const moonShadowWidth = Math.round(9 * (1 - visiblePercent));
  const isWaxing = phase < 0.5;

  // 3. Deterministic star field
  const stars = useMemo(() => (
    [...Array(34)].map((_, i) => ({
      id: i,
      top: seeded(i, 1) * 78,
      left: seeded(i, 2) * 100,
      size: seeded(i, 3) > 0.75 ? 4 : 2,
      delay: seeded(i, 4) * 4,
    }))
  ), []);

  // 4. Stepped pixel hills (staircase path = true pixel steps, deterministic)
  const hillPath = (baseY: number, amp: number, step: number, salt: number) => {
    let d = `M0,320 L0,${baseY}`;
    let prevH = Math.round((Math.sin(0 / 220 + salt) + Math.sin(0 / 90 + salt * 2) * 0.5) * amp);
    for (let x = step; x <= 1440; x += step) {
      const h = Math.round((Math.sin(x / 220 + salt) + Math.sin(x / 90 + salt * 2) * 0.5) * amp);
      d += ` L${x},${baseY + prevH} L${x},${baseY + h}`; // horizontal run, then vertical step
      prevH = h;
    }
    d += ' L1440,320 Z';
    return d;
  };

  return (
    <div style={{
        background: `linear-gradient(to bottom, ${colors.start}, ${colors.mid}, ${colors.end})`,
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
        transition: 'background 3s ease'
    }}>

      {/* Weather Effects Layer - Passed full weather object */}
      {weather && <WeatherOverlay weather={weather} />}

      {/* Stars (night only) */}
      <div
        className="absolute inset-0 z-0 transition-opacity duration-[2000ms]"
        style={{ opacity: (sunY > 80 || clockState === ClockState.SLEEP) ? 0.9 : 0 }}
      >
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute bg-white animate-twinkle"
            style={{
              top: `${s.top}%`, left: `${s.left}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* SUN — pixel disc with slow spinning ray cross */}
      <div
        className="absolute w-24 h-24 transition-all duration-[5000ms]"
        style={{ top: `${sunY}%`, left: `${sunX}%`, opacity: sunY > 110 ? 0 : 1, transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-[-18%] animate-pulse-slow">
          <PixelSprite grid={SUN_GRID} colors={{ O: '#f97316', Y: '#fde047' }} />
        </div>
      </div>

      {/* MOON — pixel disc with phase shadow */}
      <div
        className="absolute w-20 h-20 transition-all duration-[5000ms]"
        style={{ top: `${moonY}%`, left: `${moonX}%`, opacity: moonY > 110 ? 0 : 1, transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' }}
      >
        <PixelSprite
          grid={MOON_GRID}
          colors={{ W: '#fef9c3' }}
          shadowSide={isWaxing ? 'right' : 'left'}
          shadowWidth={moonShadowWidth}
        />
      </div>

      {/* PIXEL HILLS — two stepped layers */}
      <div className="absolute bottom-0 left-0 w-full h-[34%] z-0 overflow-hidden">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full block shape-rendering-crispEdges">
          <path fill={colors.hill1} d={hillPath(120, 22, 48, 1.2)} />
          <path fill={colors.hill2} d={hillPath(190, 16, 64, 3.7)} />
          <path fill={colors.wave} fillOpacity="0.35" d={hillPath(252, 8, 96, 5.1)} />
        </svg>
      </div>

    </div>
  );
});

export default WaveBackground;

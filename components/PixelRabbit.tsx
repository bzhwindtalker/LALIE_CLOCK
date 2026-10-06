import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClockState, WeatherData, WeatherCondition } from '../types';
import { SPRITES, PALETTE, PixelGrid } from './PixelRabbitSprites';

interface RabbitProps {
  clockState: ClockState;
  weather: WeatherData | null;
}

const PixelRabbit: React.FC<RabbitProps> = React.memo(({ clockState, weather }) => {
  const isRain = weather?.condition === WeatherCondition.RAIN || weather?.condition === WeatherCondition.STORM;
  const isSnow = weather?.condition === WeatherCondition.SNOW;
  const isWindy = weather?.isWindy || false; // Updated to check boolean

  // Animation State
  const [frameIdx, setFrameIdx] = useState(0);
  const [action, setAction] = useState<'IDLE' | 'HOP' | 'SLEEP' | 'UMBRELLA' | 'STORY' | 'CAR' | 'SNOW' | 'SNOWMAN' | 'KITE' | 'LOVE'>('IDLE');
  const [posX, setPosX] = useState(50); // %
  const [posY, setPosY] = useState(20); // % from bottom
  const [zIndex, setZIndex] = useState(40); // Layer depth (20=Behind text, 40=In front)
  const [direction, setDirection] = useState(1); // 1 = Right, -1 = Left
  const [isMoving, setIsMoving] = useState(false);
  
  // Logic Refs
  const lastLogicTick = useRef(0);
  const animationTimer = useRef<number | null>(null);

  // --- RENDERER (merges same-color runs into single rects: no seams, fewer nodes) ---
  const renderSprite = useCallback((grid: PixelGrid) => {
    const rects: React.ReactNode[] = [];
    const height = grid.length;
    const width = grid[0].length;

    grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const char = row[x];
        if (char === '.') { x++; continue; }
        let run = 1;
        while (x + run < row.length && row[x + run] === char) run++;
        rects.push(
          <rect
            key={`${x}-${y}`}
            x={x} y={y}
            width={run} height={1}
            fill={PALETTE[char] || '#000'}
          />
        );
        x += run;
      }
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full shape-rendering-crispEdges">
        {rects}
      </svg>
    );
  }, []);

  // --- BRAIN: Game Loop ---
  useEffect(() => {
    const tickRate = 250; // 4 FPS

    const tick = () => {
      const now = Date.now();
      
      // 1. DECISION LOGIC (Runs every 4.5s)
      if (now - lastLogicTick.current > 4500) {
        lastLogicTick.current = now;
        
        let nextAction: typeof action = 'IDLE';
        
        // Vertical Wander & Depth Logic — stay in the bottom band so text stays readable
        const newY = Math.max(3, Math.min(14, posY + (Math.random() * 6 - 3)));
        setPosY(newY);
        const newZ = 20; // always behind the clock text (z-30)
        setZIndex(newZ);

        // Collision Avoidance Logic
        const inTextZone = posX > 25 && posX < 75;

        // Priority Overrides
        if (clockState === ClockState.SLEEP || clockState === ClockState.NAP) {
           nextAction = 'SLEEP';
        } else if (clockState === ClockState.STORY) {
           nextAction = 'STORY';
        } else if (isRain) {
           nextAction = 'UMBRELLA';
        } else if (isSnow) {
           nextAction = Math.random() > 0.7 ? 'SNOWMAN' : 'SNOW';
        } else {
           // WAKE / QUIET Randoms
           const rand = Math.random();
           
           if (isWindy && rand > 0.5) {
             nextAction = 'KITE';
           } else if (rand > 0.95) {
             nextAction = 'CAR'; // Very rare
           } else if (rand > 0.90) {
             nextAction = 'LOVE'; // Rare heart mode
           } else if (rand > 0.80) {
             nextAction = 'KITE'; // Less rare
           } else if (rand > 0.40) {
             nextAction = 'HOP'; // Move around
             
             // Change direction randomly
             if (Math.random() > 0.5) {
                 const newDir = Math.random() > 0.5 ? 1 : -1;
                 if (posX < 10) setDirection(1);
                 else if (posX > 90) setDirection(-1);
                 else setDirection(newDir);
             }
           } else {
             nextAction = 'IDLE';
           }

           // Force move if idling in the text zone (keeps the center clear)
           if (inTextZone && nextAction === 'IDLE') {
               if (Math.random() < 0.8) {
                   nextAction = 'HOP';
                   if (posX > 50) setDirection(1); 
                   else setDirection(-1); 
               }
           }
        }

        setAction(nextAction);
        setIsMoving(nextAction === 'HOP' || nextAction === 'CAR' || nextAction === 'SNOW' || nextAction === 'KITE');
      }

      // 2. ANIMATION UPDATE
      setFrameIdx(prev => prev + 1);

      // 3. PHYSICS UPDATE
      if (isMoving) {
         if (action === 'HOP' || action === 'SNOW') {
             const currentFrame = frameIdx % 4; // 4 frames animation loop
             if (currentFrame === 1 || currentFrame === 3) { 
                 setPosX(prev => Math.min(95, Math.max(5, prev + (direction * 1.5))));
             }
         } else if (action === 'CAR') {
             setPosX(prev => {
                const next = prev + (direction * 2.5);
                if (next > 95) setDirection(-1);
                if (next < 5) setDirection(1);
                return next;
             });
         } else if (action === 'KITE') {
             setPosX(prev => Math.min(95, Math.max(5, prev + (direction * 0.5)))); // Slow drift
         }
      }
    };

    animationTimer.current = setInterval(tick, tickRate);
    return () => {
      if (animationTimer.current) clearInterval(animationTimer.current);
    };
  }, [clockState, isRain, isSnow, isWindy, isMoving, direction, action, frameIdx, posX, posY]);

  // --- SPRITE SELECTION ---
  const getCurrentSprite = () => {
    let spriteSet = SPRITES.IDLE;
    
    // Map actions to sprite sets
    if (action === 'SLEEP') spriteSet = SPRITES.SLEEP;
    else if (action === 'HOP') spriteSet = SPRITES.HOP;
    else if (action === 'UMBRELLA') spriteSet = SPRITES.UMBRELLA;
    else if (action === 'STORY') spriteSet = SPRITES.STORY;
    else if (action === 'CAR') spriteSet = SPRITES.CAR;
    else if (action === 'SNOW') spriteSet = SPRITES.SNOW;
    else if (action === 'SNOWMAN') spriteSet = SPRITES.SNOWMAN;
    else if (action === 'KITE') spriteSet = SPRITES.KITE;
    else if (action === 'LOVE') spriteSet = SPRITES.LOVE;

    const index = frameIdx % spriteSet.length;
    return spriteSet[index];
  };

  const sprite = getCurrentSprite();
  const widthRatio = (action === 'IDLE' || action === 'LOVE' || action === 'SNOWMAN') ? '130px' : (action === 'SLEEP' ? '190px' : '170px');
  const heightRatio = '170px';

  // Zzz is baked into the SLEEP sprite frames (see tools/gen_sprites.py)
  
  return (
    <div 
        className="absolute transition-all duration-1000 ease-in-out will-change-transform"
        style={{ 
            left: `${posX}%`, 
            bottom: `${posY}%`, 
            zIndex: zIndex,
            transform: `translateX(-50%)`,
            width: widthRatio, 
            height: heightRatio
        }}
    >
        <div 
          className="relative w-full h-full"
          // CRITICAL FIX: If action is KITE, force scaleX(1) so kite always flies with the fixed wind (Left -> Right)
          // Otherwise, use the calculated direction.
          style={{ transform: `scaleX(${action === 'KITE' ? 1 : direction})` }} 
        >
            {renderSprite(sprite)}
          </div>
        <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 w-20 h-3 bg-black/40 rounded-full" style={{ filter: 'blur(2px)' }} />
    </div>
  );
});

export default PixelRabbit;
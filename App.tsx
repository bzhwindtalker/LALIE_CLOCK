import React, { useState, useEffect, useCallback, useRef } from 'react';
import WaveBackground from './components/WaveBackground';
import TimeDisplay from './components/TimeDisplay';
import SettingsPanel from './components/SettingsPanel';
import PixelRabbit from './components/PixelRabbit';
import { loadConfig, saveConfig } from './services/storageService';
import { fetchWeather } from './services/weatherService';
import { AppConfig, ClockState, WeatherData, WeatherCondition } from './types';

const getMinutes = (h: number, m: number) => h * 60 + m;

const App: React.FC = () => {
  // REMOVED: time state (caused re-render every second)
  // Now we only re-render when config, weather, or clockState changes.
  
  const [config, setConfig] = useState<AppConfig>(loadConfig());
  
  // State Management
  const [clockState, setClockState] = useState<ClockState>(ClockState.WAKE);
  const [overrideState, setOverrideState] = useState<ClockState | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  // Track previous scheduled state to detect changes
  const prevScheduledStateRef = useRef<ClockState | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Swipe Gesture Refs
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const isSwipeRef = useRef(false);

  // Weather Fetch Loop (Real Data)
  useEffect(() => {
    if (config.demoMode) return; // Skip real fetch in demo mode

    const getWeatherData = async () => {
      // Pass the manual location config to the service
      const data = await fetchWeather(config.location);
      if (data) setWeather(data);
    };

    getWeatherData(); // Initial fetch
    const weatherTimer = setInterval(getWeatherData, 30 * 60 * 1000); // 30 mins
    return () => clearInterval(weatherTimer);
  }, [config.demoMode, config.location]); 

  // Demo Mode Loop
  useEffect(() => {
    if (!config.demoMode) return;

    let step = 0;
    const demoSteps = [
        { condition: WeatherCondition.CLEAR, temp: 15, sunriseOffset: -10 * 60 * 1000, sunsetOffset: 12 * 60 * 60 * 1000, moonPhase: 0.1, isDay: true, isWindy: false, windSpeed: 5, windDir: 'N' },
        { condition: WeatherCondition.WINDY, temp: 20, sunriseOffset: -6 * 60 * 60 * 1000, sunsetOffset: 6 * 60 * 60 * 1000, moonPhase: 0.25, isDay: true, isWindy: true, windSpeed: 45, windDir: 'W' },
        { condition: WeatherCondition.RAIN, temp: 18, sunriseOffset: -12 * 60 * 60 * 1000, sunsetOffset: 15 * 60 * 1000, moonPhase: 0.5, isDay: true, isWindy: true, windSpeed: 25, windDir: 'SW' },
        { condition: WeatherCondition.SNOW, temp: -2, sunriseOffset: 5 * 60 * 60 * 1000, sunsetOffset: -5 * 60 * 60 * 1000, moonPhase: 0.75, isDay: false, isWindy: false, windSpeed: 10, windDir: 'NE' },
        { condition: WeatherCondition.STORM, temp: 10, sunriseOffset: 3 * 60 * 60 * 1000, sunsetOffset: -8 * 60 * 60 * 1000, moonPhase: 0.9, isDay: false, isWindy: true, windSpeed: 60, windDir: 'S' }
    ];

    const runDemoStep = () => {
        const s = demoSteps[step % demoSteps.length];
        const now = new Date();
        setWeather({
            condition: s.condition,
            temp: s.temp,
            sunrise: new Date(now.getTime() + s.sunriseOffset),
            sunset: new Date(now.getTime() + s.sunsetOffset),
            moonPhase: s.moonPhase,
            isDay: s.isDay,
            isWindy: s.isWindy,
            windSpeed: s.windSpeed,
            windDir: s.windDir
        });
        step++;
    };

    runDemoStep(); 
    const demoTimer = setInterval(runDemoStep, 5000); 

    return () => clearInterval(demoTimer);
  }, [config.demoMode]);

  // Calculate what the schedule says the state SHOULD be
  // Note: We now instantiate 'new Date()' inside here instead of receiving it as a prop
  const getScheduledState = useCallback(() => {
    const now = new Date();
    const currentMins = getMinutes(now.getHours(), now.getMinutes());
    
    // 1. Check Nap Override
    const napStart = getMinutes(config.napTime.startHour, config.napTime.startMinute);
    const napEnd = napStart + config.napDuration;
    const isNapTime = napEnd >= napStart 
        ? (currentMins >= napStart && currentMins < napEnd)
        : (currentMins >= napStart || currentMins < napEnd);

    if (isNapTime) return ClockState.NAP;

    // 2. Day-aware wake time (Wed + weekend sleep in)
    //    Sunday=0, Wednesday=3, Saturday=6
    const dow = now.getDay();
    const dayWake = (dow === 0 || dow === 6)
        ? config.wakeTimeWeekend
        : (dow === 3 ? config.wakeTimeWed : config.wakeTime);
    const wakeMins = getMinutes(dayWake.startHour, dayWake.startMinute);

    // QUIET starts the same lead time before wake as on school days
    const baseWake = getMinutes(config.wakeTime.startHour, config.wakeTime.startMinute);
    const baseQuiet = getMinutes(config.quietTime.startHour, config.quietTime.startMinute);
    const quietLead = ((baseWake - baseQuiet) % 1440 + 1440) % 1440;
    const quietMins = ((wakeMins - quietLead) % 1440 + 1440) % 1440;

    // 3. Standard Schedule Evaluation
    const schedule = [
        { state: ClockState.WAKE, mins: wakeMins },
        { state: ClockState.QUIET, mins: quietMins },
        { state: ClockState.STORY, mins: getMinutes(config.storyTime.startHour, config.storyTime.startMinute) },
        { state: ClockState.SLEEP, mins: getMinutes(config.sleepTime.startHour, config.sleepTime.startMinute) },
    ];

    schedule.sort((a, b) => a.mins - b.mins);

    let active = schedule[schedule.length - 1]; 
    for (let i = 0; i < schedule.length; i++) {
        if (currentMins >= schedule[i].mins) {
            active = schedule[i];
        }
    }
    
    return active.state;
  }, [config]);

  // Main Logic Loop: Checks schedule every 5 seconds instead of 1 second
  // This drastically reduces CPU usage on Pi Zero
  useEffect(() => {
    const checkState = () => {
        const scheduled = getScheduledState();
        
        // Initialize ref on first run
        if (prevScheduledStateRef.current === null) {
            prevScheduledStateRef.current = scheduled;
        }

        // Check if the scheduled state has changed
        if (prevScheduledStateRef.current !== scheduled) {
            if (overrideState !== null) {
                console.log("Schedule changed releasing override.");
                setOverrideState(null);
            }
            prevScheduledStateRef.current = scheduled;
        }

        // Determine Final State
        const finalState = overrideState || scheduled;
        
        // Only trigger react render if state ACTUALLY changed
        setClockState(prev => {
            if (prev !== finalState) {
                // Update message as side effect of state change
                switch(finalState) {
                    case ClockState.SLEEP: setStatusMessage("STAY IN BED"); break;
                    case ClockState.NAP: setStatusMessage("REST & RECHARGE"); break;
                    case ClockState.QUIET: setStatusMessage("QUIET PLAY ONLY"); break;
                    case ClockState.STORY: setStatusMessage("STORY TIME"); break;
                    case ClockState.WAKE: setStatusMessage("SYSTEMS ONLINE"); break;
                }
                return finalState;
            }
            return prev;
        });
    };

    checkState(); // Run immediately
    const interval = setInterval(checkState, 5000); // Check every 5s
    return () => clearInterval(interval);

  }, [config, getScheduledState, overrideState]);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    setShowSettings(false);
  };

  const handleToggleDemo = () => {
    const newConfig = { ...config, demoMode: !config.demoMode };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const handleForceMode = (state: ClockState | null) => {
    setOverrideState(state);
  };

  // --- TOUCH / GESTURE HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
    };
    isSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
     if (!touchStartRef.current) return;
     
     const diffX = e.touches[0].clientX - touchStartRef.current.x;
     const diffY = e.touches[0].clientY - touchStartRef.current.y;
     
     // 1. Detect if movement is significantly horizontal (swipe candidate)
     if (Math.abs(diffX) > Math.abs(diffY)) {
        // Prevent default browser behavior (navigating back/forward) only for horizontal moves
        if (Math.abs(diffX) > 10) {
            // e.preventDefault(); // Note: React SyntheticEvent might not support this directly in all setups, but worth trying if passive is false
            isSwipeRef.current = true;
        }
     }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
     if (!touchStartRef.current) return;
     
     if (isSwipeRef.current) {
         const touchEndX = e.changedTouches[0].clientX;
         const diffX = touchEndX - touchStartRef.current.x;
         
         // Threshold for Swipe: 50px (kept same, but logic refined)
         if (Math.abs(diffX) > 50) {
             const direction = diffX < 0 ? 1 : -1; // < 0 is Swipe Left (Next), > 0 is Swipe Right (Prev)
             cycleMode(direction);
         }
     }
     
     // Debounce clearing ref to prevent accidental taps firing immediately after swipe
     setTimeout(() => {
        touchStartRef.current = null;
        isSwipeRef.current = false;
     }, 100);
  };

  const cycleMode = (direction: number) => {
    const modes = [ClockState.QUIET, ClockState.WAKE, ClockState.NAP, ClockState.STORY, ClockState.SLEEP];
    const currentMode = overrideState || clockState;
    const currentIndex = modes.indexOf(currentMode);
    
    let nextIndex = (currentIndex + direction) % modes.length;
    if (nextIndex < 0) nextIndex = modes.length - 1;
    
    setOverrideState(modes[nextIndex]);
  };

  const [lastTap, setLastTap] = useState(0);
  const handleScreenTap = () => {
    // If it was a swipe gesture, ignore the tap/click event
    if (isSwipeRef.current) {
        return;
    }

    const now = Date.now();
    // Double tap to open settings
    if (now - lastTap < 500) {
        setShowSettings(true);
    }
    setLastTap(now);
  };

  const getBrightness = () => {
    switch(clockState) {
      case ClockState.SLEEP: return config.brightness.sleep;
      case ClockState.QUIET: return config.brightness.quiet;
      case ClockState.WAKE: return config.brightness.wake;
      case ClockState.NAP: return config.brightness.nap;
      case ClockState.STORY: return config.brightness.story;
      default: return 100;
    }
  };

  const currentBrightness = getBrightness();

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden cursor-none select-none touch-manipulation"
      onClick={handleScreenTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background (Z-0) with Weather */}
      <WaveBackground clockState={clockState} weather={weather} />

      {/* Rabbit (Z-10) */}
      <PixelRabbit clockState={clockState} weather={weather} />

      {/* Weather Chip (top-left, out of the rabbit's way) */}
      {weather && (
        <div className="absolute top-2 left-2 z-40 pointer-events-none">
          <div className="bg-black/40 border-2 border-white/20 rounded px-4 py-2 font-vcr text-white text-xl tracking-wide">
            <span className="text-2xl">{weather.temp}°C {weather.condition}</span>
            <span className="ml-3 text-white/70">💨 {weather.windSpeed}km/h {weather.windDir}</span>
          </div>
        </div>
      )}

      {/* Content (Z-30) */}
      <div className="relative z-30 flex flex-col items-center justify-center h-full w-full pointer-events-none pb-[14vh]">
        <div className={`
          text-2xl md:text-3xl font-pixel mb-4 text-center px-4 py-2 rounded border-4 transition-all duration-1000
          ${clockState === ClockState.SLEEP ? 'text-red-500 border-red-900 bg-black/75' : ''}
          ${clockState === ClockState.NAP ? 'text-blue-300 border-blue-900 bg-black/75' : ''}
          ${clockState === ClockState.STORY ? 'text-purple-300 border-purple-900 bg-black/75' : ''}
          ${clockState === ClockState.QUIET ? 'text-yellow-400 border-yellow-900 bg-black/75' : ''}
          ${clockState === ClockState.WAKE ? 'text-neon-green border-green-900 bg-black/75' : ''}
        `}>
          {clockState === ClockState.SLEEP && "🌙 SLEEP MODE"}
          {clockState === ClockState.NAP && "☁️ NAP TIME"}
          {clockState === ClockState.QUIET && "🤫 QUIET MODE"}
          {clockState === ClockState.STORY && "📖 STORY TIME"}
          {clockState === ClockState.WAKE && "☀️ WAKE UP"}
        </div>
        
        {/* Override Indicator */}
        {overrideState && (
            <div className="mb-2 text-neon-pink font-vcr text-sm animate-pulse">
                ⚠ MANUAL OVERRIDE ACTIVE ⚠
            </div>
        )}

        {/* Demo Indicator */}
        {config.demoMode && (
            <div className="mb-2 text-yellow-400 font-pixel text-xs animate-bounce bg-black/50 px-2 py-1 rounded">
                DEMO MODE: WEATHER SIMULATION
            </div>
        )}

        {/* TimeDisplay now handles its own internal timer */}
        <TimeDisplay />

        <div className="mt-4 flex flex-col items-center font-vcr text-white/60 text-2xl tracking-widest px-4">
          <div className="bg-black/40 border-2 border-white/15 rounded px-4 py-1">{statusMessage}</div>
        </div>
      </div>

      {/* GLOBAL DIMMER (Z-50) */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-1000 z-50"
        style={{ opacity: 1 - (currentBrightness / 100) }}
      />

      {/* Settings Button (Z-55) */}
      <button 
        onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
        className="absolute top-0 right-0 p-8 z-[55] text-white/30 hover:text-white transition-colors focus:outline-none active:scale-95"
        aria-label="Settings"
      >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 drop-shadow-md">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 018.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
      </button>

      {/* Settings Modal (Z-60) */}
      {showSettings && (
        <SettingsPanel 
          config={config} 
          onSave={handleSaveConfig} 
          onClose={closeSettings}
          onPreview={handleForceMode}
          onToggleDemo={handleToggleDemo}
          activeMode={clockState}
        />
      )}
    </div>
  );
};

export default App;
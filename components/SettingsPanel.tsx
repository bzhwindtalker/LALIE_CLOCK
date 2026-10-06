import React, { useState, useEffect } from 'react';
import { AppConfig, TimeSchedule, ClockState } from '../types';

interface SettingsPanelProps {
  config: AppConfig;
  onSave: (newConfig: AppConfig) => void;
  onClose: () => void;
  onPreview: (state: ClockState | null) => void; // Now acts as "Force Mode"
  onToggleDemo: () => void;
  activeMode: ClockState;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onSave, onClose, onPreview, onToggleDemo, activeMode }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  // Sync localConfig.demoMode with prop config.demoMode
  useEffect(() => {
    setLocalConfig(prev => ({ ...prev, demoMode: config.demoMode }));
  }, [config.demoMode]);

  const handleTimeChange = (key: keyof AppConfig, hour: string, minute: string) => {
    if (['sleepTime', 'quietTime', 'wakeTime', 'wakeTimeWed', 'wakeTimeWeekend', 'napTime', 'storyTime'].includes(key)) {
        const newSchedule: TimeSchedule = {
          startHour: parseInt(hour) || 0,
          startMinute: parseInt(minute) || 0
        };
        setLocalConfig({ ...localConfig, [key]: newSchedule });
    }
  };

  const handleBrightnessChange = (mode: keyof AppConfig['brightness'], value: string) => {
      setLocalConfig({
          ...localConfig,
          brightness: {
              ...localConfig.brightness,
              [mode]: parseInt(value)
          }
      });
  };

  const handleLocationChange = (key: 'lat' | 'lng', value: string) => {
      setLocalConfig({
          ...localConfig,
          location: {
              ...localConfig.location,
              [key]: parseFloat(value) || 0
          }
      });
  };

  const toggleManualLocation = () => {
      setLocalConfig({
          ...localConfig,
          location: {
              ...localConfig.location,
              useManual: !localConfig.location.useManual
          }
      });
  };

  const getThemeColors = () => {
    switch(activeMode) {
        case ClockState.SLEEP: return { border: 'border-red-600', text: 'text-red-400', bg: 'bg-red-950' };
        case ClockState.QUIET: return { border: 'border-yellow-600', text: 'text-yellow-400', bg: 'bg-yellow-950' };
        case ClockState.WAKE: return { border: 'border-neon-green', text: 'text-neon-green', bg: 'bg-gray-900' };
        case ClockState.NAP: return { border: 'border-blue-400', text: 'text-blue-300', bg: 'bg-blue-950' };
        case ClockState.STORY: return { border: 'border-purple-400', text: 'text-purple-300', bg: 'bg-purple-950' };
        default: return { border: 'border-white', text: 'text-white', bg: 'bg-gray-900' };
    }
  };
  const theme = getThemeColors();

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className={`flex items-center justify-between p-4 border-b-4 ${theme.border} ${theme.bg}`}>
          <h2 className={`text-2xl font-pixel ${theme.text} underline decoration-wavy`}>
            CONFIG
          </h2>
          <div className="flex gap-4">
              <button onClick={() => onSave(localConfig)} className="px-6 py-3 bg-neon-green text-black font-bold font-vcr text-xl rounded shadow-lg active:scale-95 border-2 border-white">
                SAVE
              </button>
              <button onClick={onClose} className="px-6 py-3 bg-red-600 text-white font-bold font-vcr text-xl rounded shadow-lg active:scale-95 border-2 border-white">
                X
              </button>
          </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-40">
        
        {/* Force Mode Bar */}
        <div className="bg-white/10 p-4 rounded-lg border border-white/20">
            <label className="block mb-2 text-white/70 text-sm font-bold uppercase">Manual Override</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <ForceBtn label="SLEEP" color="bg-red-900" isActive={activeMode === ClockState.SLEEP} onClick={() => onPreview(ClockState.SLEEP)} />
                <ForceBtn label="QUIET" color="bg-yellow-900" isActive={activeMode === ClockState.QUIET} onClick={() => onPreview(ClockState.QUIET)} />
                <ForceBtn label="WAKE" color="bg-green-900" isActive={activeMode === ClockState.WAKE} onClick={() => onPreview(ClockState.WAKE)} />
                <ForceBtn label="NAP" color="bg-blue-900" isActive={activeMode === ClockState.NAP} onClick={() => onPreview(ClockState.NAP)} />
                <ForceBtn label="STORY" color="bg-purple-900" isActive={activeMode === ClockState.STORY} onClick={() => onPreview(ClockState.STORY)} />
                <button onClick={() => onPreview(null)} className="flex-shrink-0 px-4 py-4 bg-gray-600 text-white rounded font-bold border-2 border-gray-400 min-w-[80px]">RESET</button>
            </div>
        </div>

        {/* Two Column Layout for Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Schedule Section */}
            <div className="space-y-4">
                <h3 className="text-xl text-white font-pixel border-b border-white/30 pb-2">SCHEDULE</h3>
                <div className="grid grid-cols-1 gap-4">
                    <TimeInput label="WAKE · SCHOOL" color="text-neon-green" value={localConfig.wakeTime} onChange={(h, m) => handleTimeChange('wakeTime', h, m)} />
                    <TimeInput label="WAKE · WED" color="text-neon-green" value={localConfig.wakeTimeWed} onChange={(h, m) => handleTimeChange('wakeTimeWed', h, m)} />
                    <TimeInput label="WAKE · WEEKEND" color="text-neon-green" value={localConfig.wakeTimeWeekend} onChange={(h, m) => handleTimeChange('wakeTimeWeekend', h, m)} />
                    <TimeInput label="QUIET · SCHOOL" color="text-yellow-400" value={localConfig.quietTime} onChange={(h, m) => handleTimeChange('quietTime', h, m)} />
                    <div className="text-xs text-white/40 px-1 -mt-2">
                        SCHOOL = MON TUE THU FRI. WEEKEND = SAT SUN. QUIET STARTS THE SAME GAP BEFORE WAKE ON WED AND WEEKEND.
                    </div>
                    
                    {/* Nap Section with Duration */}
                    <div className="bg-black/40 p-3 rounded border border-blue-900/50">
                        <div className="flex justify-between items-center mb-2">
                             <div className="text-blue-300 font-bold text-lg">NAP START</div>
                             <div className="flex gap-2 items-center">
                                <StepperInput value={localConfig.napTime.startHour} onChange={(v) => handleTimeChange('napTime', v, localConfig.napTime.startMinute.toString())} max={23} />
                                <span className="text-white text-2xl self-center">:</span>
                                <StepperInput value={localConfig.napTime.startMinute} onChange={(v) => handleTimeChange('napTime', localConfig.napTime.startHour.toString(), v)} max={59} />
                             </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <span className="text-blue-300 text-sm font-bold w-24">DURATION</span>
                            <div className="flex-1 flex items-center gap-2">
                                <button className="w-10 h-10 bg-gray-700 rounded text-white font-bold" onClick={() => setLocalConfig({...localConfig, napDuration: Math.max(0, localConfig.napDuration - 15)})}>-</button>
                                <span className="text-white font-mono text-lg w-16 text-center">{localConfig.napDuration}m</span>
                                <button className="w-10 h-10 bg-gray-700 rounded text-white font-bold" onClick={() => setLocalConfig({...localConfig, napDuration: localConfig.napDuration + 15})}>+</button>
                            </div>
                        </div>
                    </div>

                    <TimeInput label="STORY TIME" color="text-purple-300" value={localConfig.storyTime} onChange={(h, m) => handleTimeChange('storyTime', h, m)} />
                    <TimeInput label="SLEEP TIME" color="text-red-500" value={localConfig.sleepTime} onChange={(h, m) => handleTimeChange('sleepTime', h, m)} />
                </div>
            </div>

            {/* Brightness & Location Section */}
            <div className="space-y-4">
                <h3 className="text-xl text-white font-pixel border-b border-white/30 pb-2">DISPLAY & LOC</h3>
                
                {/* Brightness */}
                <div className="bg-black/40 p-4 rounded border border-white/10 space-y-6">
                    <BrightnessSlider label="WAKE" color="text-neon-green" accent="accent-neon-green" value={localConfig.brightness.wake} onChange={(v) => handleBrightnessChange('wake', v)} />
                    <BrightnessSlider label="QUIET" color="text-yellow-400" accent="accent-yellow-400" value={localConfig.brightness.quiet} onChange={(v) => handleBrightnessChange('quiet', v)} />
                    <BrightnessSlider label="NAP" color="text-blue-300" accent="accent-blue-400" value={localConfig.brightness.nap} onChange={(v) => handleBrightnessChange('nap', v)} />
                    <BrightnessSlider label="STORY" color="text-purple-300" accent="accent-purple-400" value={localConfig.brightness.story} onChange={(v) => handleBrightnessChange('story', v)} />
                    <BrightnessSlider label="SLEEP" color="text-red-500" accent="accent-red-500" value={localConfig.brightness.sleep} onChange={(v) => handleBrightnessChange('sleep', v)} />
                </div>

                {/* Location Settings */}
                <div className="bg-black/40 p-4 rounded border border-white/10 space-y-4">
                     <div className="flex justify-between items-center">
                         <span className="text-neon-blue font-bold font-vcr">LOCATION OVERRIDE</span>
                         <button 
                            onClick={toggleManualLocation}
                            className={`w-14 h-8 rounded-full relative transition-colors ${localConfig.location.useManual ? 'bg-neon-blue' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${localConfig.location.useManual ? 'left-7' : 'left-1'}`} />
                        </button>
                     </div>
                     
                     {localConfig.location.useManual ? (
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-xs text-white/50 block mb-1">LATITUDE</label>
                                 <input 
                                     type="number" step="0.0001"
                                     value={localConfig.location.lat}
                                     onChange={(e) => handleLocationChange('lat', e.target.value)}
                                     className="w-full bg-gray-800 text-white p-3 rounded border border-gray-600 text-lg"
                                 />
                             </div>
                             <div>
                                 <label className="text-xs text-white/50 block mb-1">LONGITUDE</label>
                                 <input 
                                     type="number" step="0.0001"
                                     value={localConfig.location.lng}
                                     onChange={(e) => handleLocationChange('lng', e.target.value)}
                                     className="w-full bg-gray-800 text-white p-3 rounded border border-gray-600 text-lg"
                                 />
                             </div>
                         </div>
                     ) : (
                         <div className="text-xs text-white/40 italic">
                             Attempting to auto-detect location via Wifi/IP...
                         </div>
                     )}
                </div>
                
                {/* Demo Mode Toggle */}
                <div className="mt-8 border-t border-white/20 pt-4 pb-12">
                    <div className="flex items-center justify-between bg-gray-800 p-4 rounded border border-gray-600">
                        <div className="flex flex-col">
                            <span className="text-neon-pink font-bold font-pixel text-sm">DEMO MODE</span>
                            <span className="text-xs text-white/50">Simulates weather & day/night cycles</span>
                        </div>
                        {/* We use config.demoMode (live prop) for visual state */}
                        <button 
                            onClick={onToggleDemo}
                            className={`w-16 h-8 rounded-full relative transition-colors ${config.demoMode ? 'bg-neon-green' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${config.demoMode ? 'left-9' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
};

// --- Optimized Sub-components for Touch ---

const ForceBtn = ({ label, color, isActive, onClick }: { label: string, color: string, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`flex-shrink-0 flex-1 px-4 py-4 ${color} text-white font-bold rounded border-2 ${isActive ? 'border-white ring-2 ring-white scale-105' : 'border-white/30'} active:scale-95 min-w-[80px] transition-all`}>
        {label}
        {isActive && <span className="block text-[0.6rem] text-white/80">ACTIVE</span>}
    </button>
);

const StepperInput = ({ value, onChange, max, min = 0 }: { value: number, onChange: (v: string) => void, max: number, min?: number }) => {
    const inc = () => {
        let next = value + 1;
        if (next > max) next = min;
        onChange(next.toString());
    };
    const dec = () => {
        let next = value - 1;
        if (next < min) next = max;
        onChange(next.toString());
    };

    return (
        <div className="flex items-center gap-1">
            <button onClick={dec} className="w-12 h-12 bg-gray-700 border-2 border-white/50 rounded flex items-center justify-center active:bg-gray-600 active:scale-95 text-xl font-bold text-white touch-manipulation">-</button>
            <div className="w-16 h-12 bg-gray-800 border-2 border-gray-500 flex items-center justify-center text-2xl font-vcr rounded text-white">{value.toString().padStart(2, '0')}</div>
            <button onClick={inc} className="w-12 h-12 bg-gray-700 border-2 border-white/50 rounded flex items-center justify-center active:bg-gray-600 active:scale-95 text-xl font-bold text-white touch-manipulation">+</button>
        </div>
    )
}

const TimeInput = ({ label, color, value, onChange }: { label: string, color: string, value: TimeSchedule, onChange: (h: string, m: string) => void }) => (
    <div className="bg-black/40 p-3 rounded border border-white/10 flex items-center justify-between">
      <div className={`text-lg ${color} font-bold`}>{label}</div>
      <div className="flex gap-2 items-center">
        <StepperInput value={value.startHour} onChange={(v) => onChange(v, value.startMinute.toString())} max={23} />
        <span className="text-white text-2xl pb-1">:</span>
        <StepperInput value={value.startMinute} onChange={(v) => onChange(value.startHour.toString(), v)} max={59} />
      </div>
    </div>
);

const BrightnessSlider = ({ label, color, accent, value, onChange }: { label: string, color: string, accent: string, value: number, onChange: (v: string) => void }) => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between">
            <span className={`text-sm font-bold ${color}`}>{label} MODE</span>
            <span className="text-white font-mono">{value}%</span>
        </div>
        <input 
            type="range" min="0" max="100" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className={`w-full h-10 ${accent} bg-gray-700 rounded-lg appearance-none cursor-pointer touch-none`} 
        />
    </div>
);

export default SettingsPanel;
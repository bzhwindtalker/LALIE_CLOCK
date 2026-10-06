
import { AppConfig, DEFAULT_CONFIG } from '../types';

const STORAGE_KEY = 'radical_clock_config_v5'; // Bumped version to force cache wipe on update

export const saveConfig = (config: AppConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save config to local storage", e);
  }
};

export const loadConfig = (): AppConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Ensure all new brightness keys exist
      if (parsed.brightness) {
          parsed.brightness = { ...DEFAULT_CONFIG.brightness, ...parsed.brightness };
      }

      // Ensure all new time schedules exist
      if (!parsed.napTime) parsed.napTime = DEFAULT_CONFIG.napTime;
      if (!parsed.storyTime) parsed.storyTime = DEFAULT_CONFIG.storyTime;
      if (!parsed.wakeTimeWed) parsed.wakeTimeWed = DEFAULT_CONFIG.wakeTimeWed;
      if (!parsed.wakeTimeWeekend) parsed.wakeTimeWeekend = DEFAULT_CONFIG.wakeTimeWeekend;

      // Ensure napDuration exists
      if (typeof parsed.napDuration !== 'number') parsed.napDuration = DEFAULT_CONFIG.napDuration;
      
      // Ensure demoMode exists
      if (typeof parsed.demoMode !== 'boolean') parsed.demoMode = false;

      // Ensure location exists
      // Fix for legacy configs where lat/lng was 0
      if (!parsed.location || (parsed.location.lat === 0 && parsed.location.lng === 0 && !parsed.location.useManual)) {
         parsed.location = DEFAULT_CONFIG.location;
      }

      // Clean up removed keys
      delete parsed.kidName;

      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load config", e);
  }
  return DEFAULT_CONFIG;
};

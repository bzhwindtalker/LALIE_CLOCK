
export enum ClockState {
  SLEEP = 'SLEEP', // Don't wake parents
  QUIET = 'QUIET', // Can play in room
  WAKE = 'WAKE',   // Party time
  NAP = 'NAP',     // Mid-day sleep
  STORY = 'STORY', // Bedtime routine
}

export enum WeatherCondition {
  CLEAR = 'CLEAR',
  PARTLY_CLOUDY = 'PARTLY_CLOUDY',
  CLOUDY = 'CLOUDY',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  STORM = 'STORM',
  FOG = 'FOG',
  WINDY = 'WINDY' // Kept for legacy fallback, but mostly calculated via boolean now
}

export interface WeatherData {
  condition: WeatherCondition;
  temp: number;
  sunrise: Date;
  sunset: Date;
  moonPhase: number; // 0.0 (New) to 0.5 (Full) to 1.0 (New)
  isDay: boolean;
  isWindy: boolean;
  windSpeed: number; // km/h
  windDir: string;   // N, NE, E, etc.
}

export interface TimeSchedule {
  startHour: number;
  startMinute: number;
}

export interface BrightnessConfig {
  sleep: number;
  quiet: number;
  wake: number;
  nap: number;
  story: number;
}

export interface LocationConfig {
  lat: number;
  lng: number;
  useManual: boolean;
}

export interface AppConfig {
  sleepTime: TimeSchedule;
  quietTime: TimeSchedule;
  wakeTime: TimeSchedule;        // school days: Mon, Tue, Thu, Fri
  wakeTimeWed: TimeSchedule;     // Wednesday (no school)
  wakeTimeWeekend: TimeSchedule; // Saturday + Sunday
  napTime: TimeSchedule;
  storyTime: TimeSchedule;
  napDuration: number; // Duration in minutes
  brightness: BrightnessConfig;
  location: LocationConfig;
  demoMode: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  wakeTime: { startHour: 7, startMinute: 0 },
  wakeTimeWed: { startHour: 7, startMinute: 30 },
  wakeTimeWeekend: { startHour: 7, startMinute: 30 },
  napTime: { startHour: 13, startMinute: 0 },
  napDuration: 90, 
  quietTime: { startHour: 6, startMinute: 30 },
  storyTime: { startHour: 20, startMinute: 0 },
  sleepTime: { startHour: 20, startMinute: 30 },
  brightness: {
    sleep: 35,
    quiet: 54,
    wake: 100,
    nap: 10,
    story: 51
  },
  location: {
    lat: 45.7485, // Lyon 69008
    lng: 4.8706,
    useManual: true 
  },
  demoMode: false,
};

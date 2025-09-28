import { writable } from 'svelte/store';

// Persistent runtime mode: 'simulation' | 'live'
const KEY = 'reactiveAppMode';
function loadInitial(){
  if (typeof window === 'undefined') return 'simulation';
  const saved = localStorage.getItem(KEY);
  if (saved === 'live' || saved === 'simulation') return saved;
  // Default derived from build-time flag for backwards compatibility
  return import.meta.env.VITE_USE_MOCK_TOKENS === 'true' ? 'simulation' : 'live';
}
export const appMode = writable(loadInitial());
appMode.subscribe(v => { if (typeof window !== 'undefined') localStorage.setItem(KEY, v); });

export function isSimulation(mode){ return mode === 'simulation'; }

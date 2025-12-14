// src/hooks/useViewMode.ts
// View mode toggle using useSyncExternalStore for reliable cross-component sync
// Mobile devices default to Simple mode

import { useSyncExternalStore, useCallback, useEffect } from 'react';

export type ViewMode = 'simple' | 'full';

const STORAGE_KEY = 'skystatus_view_mode';
const MOBILE_BREAKPOINT = 768; // px - same as Tailwind's md breakpoint

// Check if device is mobile
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// Get default mode based on device
function getDefaultMode(): ViewMode {
  return isMobileDevice() ? 'simple' : 'full';
}

// Subscribers for the store
let listeners: Array<() => void> = [];

// Get current value from localStorage, with mobile-aware default
function getSnapshot(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'simple' || stored === 'full') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return getDefaultMode();
}

// Server snapshot (for SSR, not used but required)
function getServerSnapshot(): ViewMode {
  return 'simple'; // Safe default for SSR
}

// Subscribe to changes
function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

// Notify all subscribers
function emitChange(): void {
  listeners.forEach(listener => listener());
}

// Update the store
function setMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage not available
  }
  emitChange();
}

export function useViewMode() {
  const viewMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setViewMode = useCallback((mode: ViewMode) => {
    setMode(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    const current = getSnapshot();
    setMode(current === 'simple' ? 'full' : 'simple');
  }, []);

  // On first load, if no preference is stored, set default based on device
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // No preference stored yet - set based on device type
        const defaultMode = getDefaultMode();
        localStorage.setItem(STORAGE_KEY, defaultMode);
        emitChange();
      }
    } catch {
      // localStorage not available
    }
  }, []);

  return {
    viewMode,
    isSimpleMode: viewMode === 'simple',
    isMobile: isMobileDevice(),
    setViewMode,
    toggleViewMode,
  };
}

// src/hooks/useViewMode.ts
// View mode toggle using useSyncExternalStore for reliable cross-component sync

import { useSyncExternalStore, useCallback } from 'react';

export type ViewMode = 'simple' | 'full';

const STORAGE_KEY = 'skystatus_view_mode';
const DEFAULT_MODE: ViewMode = 'full';

// Subscribers for the store
let listeners: Array<() => void> = [];

// Get current value from localStorage
function getSnapshot(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'simple' || stored === 'full') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_MODE;
}

// Server snapshot (for SSR, not used but required)
function getServerSnapshot(): ViewMode {
  return DEFAULT_MODE;
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

  return {
    viewMode,
    isSimpleMode: viewMode === 'simple',
    setViewMode,
    toggleViewMode,
  };
}

// src/hooks/useViewMode.ts
// Simple hook for view mode toggle - uses localStorage directly, no Context needed

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'simple' | 'full';

const STORAGE_KEY = 'skystatus_view_mode';
const DEFAULT_MODE: ViewMode = 'full';

// Read from localStorage (safe, returns default on error)
function getStoredMode(): ViewMode {
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

// Write to localStorage (safe, ignores errors)
function setStoredMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage not available
  }
}

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getStoredMode);

  // Sync to localStorage when mode changes
  useEffect(() => {
    setStoredMode(viewMode);
  }, [viewMode]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState(prev => prev === 'simple' ? 'full' : 'simple');
  }, []);

  return {
    viewMode,
    isSimpleMode: viewMode === 'simple',
    setViewMode,
    toggleViewMode,
  };
}

// src/hooks/useViewMode.ts
// Simple hook for view mode toggle - uses localStorage directly, no Context needed
// Uses custom event to sync state across components

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'simple' | 'full';

const STORAGE_KEY = 'skystatus_view_mode';
const DEFAULT_MODE: ViewMode = 'full';
const CHANGE_EVENT = 'skystatus_view_mode_change';

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

// Write to localStorage and broadcast change
function setStoredMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: mode }));
  } catch {
    // localStorage not available
  }
}

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getStoredMode);

  // Listen for changes from other components
  useEffect(() => {
    const handleChange = (event: CustomEvent<ViewMode>) => {
      setViewModeState(event.detail);
    };

    window.addEventListener(CHANGE_EVENT, handleChange as EventListener);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange as EventListener);
    };
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    setStoredMode(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === 'simple' ? 'full' : 'simple';
    setViewModeState(newMode);
    setStoredMode(newMode);
  }, [viewMode]);

  return {
    viewMode,
    isSimpleMode: viewMode === 'simple',
    setViewMode,
    toggleViewMode,
  };
}

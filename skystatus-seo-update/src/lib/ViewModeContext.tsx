// src/lib/ViewModeContext.tsx
// Context provider for Simple/Full view mode toggle
// Pattern follows DemoContext.tsx

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = 'simple' | 'full';

interface ViewModeContextType {
  // State
  viewMode: ViewMode;
  isSimpleMode: boolean;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'skystatus_view_mode';
const DEFAULT_MODE: ViewMode = 'full'; // Existing users keep full view

// ============================================================================
// CONTEXT
// ============================================================================

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

// ============================================================================
// HOOK
// ============================================================================

export function useViewMode(): ViewModeContextType {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
}

// Optional hook that doesn't throw (for components that may be outside provider)
export function useViewModeOptional(): ViewModeContextType | null {
  return useContext(ViewModeContext) || null;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ViewModeProviderProps {
  children: React.ReactNode;
  initialMode?: ViewMode;
}

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({
  children,
  initialMode,
}) => {
  // Initialize from localStorage or prop
  const [viewMode, setViewModeInternal] = useState<ViewMode>(() => {
    if (initialMode) return initialMode;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'simple' || stored === 'full') {
        return stored;
      }
    } catch {
      // localStorage not available
    }
    return DEFAULT_MODE;
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, viewMode);
    } catch {
      // localStorage not available
    }
  }, [viewMode]);

  // Set view mode
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeInternal(mode);
  }, []);

  // Toggle between modes
  const toggleViewMode = useCallback(() => {
    setViewModeInternal(prev => prev === 'simple' ? 'full' : 'simple');
  }, []);

  const value: ViewModeContextType = {
    viewMode,
    isSimpleMode: viewMode === 'simple',
    setViewMode,
    toggleViewMode,
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};

export default ViewModeProvider;

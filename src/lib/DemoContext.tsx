// src/lib/DemoContext.tsx
// Context provider for demo mode state management

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { StatusLevel } from '../types';
import { generateDemoDataForStatus, DemoDataSet, STATUS_CONFIGS } from './demoDataGenerator';

// ============================================================================
// TYPES
// ============================================================================

interface DemoContextType {
  // State
  isDemoMode: boolean;
  demoStatus: StatusLevel;
  demoData: DemoDataSet | null;
  isTransitioning: boolean;
  
  // Actions
  setDemoStatus: (status: StatusLevel) => void;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  
  // Config for UI
  getStatusConfig: (status: StatusLevel) => typeof STATUS_CONFIGS[StatusLevel];
}

// ============================================================================
// CONTEXT
// ============================================================================

const DemoContext = createContext<DemoContextType | undefined>(undefined);

// ============================================================================
// HOOK
// ============================================================================

export function useDemoMode(): DemoContextType {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoMode must be used within DemoProvider');
  }
  return context;
}

// Optional hook that doesn't throw (for components that may or may not be in demo mode)
export function useDemoModeOptional(): DemoContextType | null {
  return useContext(DemoContext) || null;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface DemoProviderProps {
  children: React.ReactNode;
  initialActive?: boolean;
  onExitDemo?: () => void;
}

export const DemoProvider: React.FC<DemoProviderProps> = ({
  children,
  initialActive = false,
  onExitDemo,
}) => {
  const [isDemoMode, setIsDemoMode] = useState(initialActive);
  const [demoStatus, setDemoStatusInternal] = useState<StatusLevel>('Platinum');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Generate demo data when status changes
  const demoData = useMemo(() => {
    if (!isDemoMode) return null;
    return generateDemoDataForStatus(demoStatus);
  }, [isDemoMode, demoStatus]);

  // Set demo status with transition animation
  const setDemoStatus = useCallback((status: StatusLevel) => {
    if (status === demoStatus) return;
    
    setIsTransitioning(true);
    
    // Short delay for fade-out effect
    setTimeout(() => {
      setDemoStatusInternal(status);
      
      // Fade back in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 150);
  }, [demoStatus]);

  // Enter demo mode
  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setDemoStatusInternal('Platinum'); // Default to Platinum
  }, []);

  // Exit demo mode
  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    if (onExitDemo) {
      onExitDemo();
    }
  }, [onExitDemo]);

  // Get status config
  const getStatusConfig = useCallback((status: StatusLevel) => {
    return STATUS_CONFIGS[status];
  }, []);

  const value: DemoContextType = {
    isDemoMode,
    demoStatus,
    demoData,
    isTransitioning,
    setDemoStatus,
    enterDemoMode,
    exitDemoMode,
    getStatusConfig,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};

export default DemoProvider;

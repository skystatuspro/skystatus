// src/hooks/queries/useDataQueries.ts
// React Query hooks for all data fetching and mutations
// These replace the manual state management in useUserData

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/AuthContext';
import {
  fetchAllUserData,
  saveFlights,
  saveMilesRecords,
  saveRedemptions,
  saveXPLedger,
  updateProfile,
  deleteAllUserData,
  upsertActivityTransactions,
  deleteAllActivityTransactions,
  XPLedgerEntry,
} from '../../lib/dataService';
import type { FlightRecord, MilesRecord, RedemptionRecord, ManualLedger, ActivityTransaction } from '../../types';
import type { QualificationSettings } from '../../types/qualification';
import type { CurrencyCode } from '../../utils/format';

// ============================================================================
// QUERY KEYS - Centralized for consistency
// ============================================================================

export const queryKeys = {
  all: ['userData'] as const,
  user: (userId: string) => ['userData', userId] as const,
  flights: (userId: string) => ['userData', userId, 'flights'] as const,
  miles: (userId: string) => ['userData', userId, 'miles'] as const,
  redemptions: (userId: string) => ['userData', userId, 'redemptions'] as const,
  xpLedger: (userId: string) => ['userData', userId, 'xpLedger'] as const,
  profile: (userId: string) => ['userData', userId, 'profile'] as const,
  activityTransactions: (userId: string) => ['userData', userId, 'activityTransactions'] as const,
};

// ============================================================================
// MAIN DATA QUERY - Fetches everything at once
// ============================================================================

export interface UserDataQueryResult {
  flights: FlightRecord[];
  milesData: MilesRecord[];
  redemptions: RedemptionRecord[];
  xpLedger: Record<string, XPLedgerEntry>;
  activityTransactions: ActivityTransaction[];  // New transaction system
  profile: {
    targetCPM: number;
    qualificationStartMonth: string;
    qualificationStartDate?: string;
    homeAirport: string | null;
    xpRollover: number;
    startingStatus: string | null;
    startingXP: number | null;
    startingUXP: number;
    ultimateCycleType: 'qualification' | 'calendar' | null;
    currency: string;
    onboardingCompleted: boolean;
    emailConsent: boolean;
    milesBalance: number;
    currentUXP: number;
    useNewTransactions: boolean;  // Migration flag
  } | null;
}

export function useUserDataQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.user(userId ?? ''),
    queryFn: async (): Promise<UserDataQueryResult> => {
      if (!userId) throw new Error('No user ID');
      console.log('[useUserDataQuery] Fetching all data for user:', userId);
      const data = await fetchAllUserData(userId);
      console.log('[useUserDataQuery] Received data:', {
        flights: data.flights.length,
        miles: data.milesData.length,
        xpLedgerKeys: Object.keys(data.xpLedger),
        activityTransactions: data.activityTransactions.length,
        useNewTransactions: data.profile?.useNewTransactions,
      });
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes (formerly cacheTime)
  });
}

// ============================================================================
// MUTATIONS - For saving data
// ============================================================================

// Save flights
export function useSaveFlights() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (flights: FlightRecord[]) => {
      if (!user?.id) throw new Error('No user');
      console.log('[useSaveFlights] Saving', flights.length, 'flights');
      return saveFlights(user.id, flights);
    },
    onMutate: async (newFlights) => {
      if (!user?.id) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.user(user.id) });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData<UserDataQueryResult>(queryKeys.user(user.id));
      
      // Optimistically update
      if (previous) {
        queryClient.setQueryData<UserDataQueryResult>(queryKeys.user(user.id), {
          ...previous,
          flights: newFlights,
        });
      }
      
      return { previous };
    },
    onError: (err, newFlights, context) => {
      console.error('[useSaveFlights] Error:', err);
      // Rollback on error
      if (context?.previous && user?.id) {
        queryClient.setQueryData(queryKeys.user(user.id), context.previous);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
    },
  });
}

// Save miles records
export function useSaveMilesRecords() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (milesData: MilesRecord[]) => {
      if (!user?.id) throw new Error('No user');
      console.log('[useSaveMilesRecords] Saving', milesData.length, 'records');
      return saveMilesRecords(user.id, milesData);
    },
    onMutate: async (newMilesData) => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.user(user.id) });
      const previous = queryClient.getQueryData<UserDataQueryResult>(queryKeys.user(user.id));
      
      if (previous) {
        queryClient.setQueryData<UserDataQueryResult>(queryKeys.user(user.id), {
          ...previous,
          milesData: newMilesData,
        });
      }
      return { previous };
    },
    onError: (err, _, context) => {
      console.error('[useSaveMilesRecords] Error:', err);
      if (context?.previous && user?.id) {
        queryClient.setQueryData(queryKeys.user(user.id), context.previous);
      }
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
    },
  });
}

// Save redemptions
export function useSaveRedemptions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (redemptions: RedemptionRecord[]) => {
      if (!user?.id) throw new Error('No user');
      return saveRedemptions(user.id, redemptions);
    },
    onMutate: async (newRedemptions) => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.user(user.id) });
      const previous = queryClient.getQueryData<UserDataQueryResult>(queryKeys.user(user.id));
      
      if (previous) {
        queryClient.setQueryData<UserDataQueryResult>(queryKeys.user(user.id), {
          ...previous,
          redemptions: newRedemptions,
        });
      }
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous && user?.id) {
        queryClient.setQueryData(queryKeys.user(user.id), context.previous);
      }
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
    },
  });
}

// Save XP Ledger - THE CRITICAL ONE
export function useSaveXPLedger() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ledger: Record<string, XPLedgerEntry>) => {
      if (!user?.id) throw new Error('No user');
      console.log('[useSaveXPLedger] Saving ledger:', Object.keys(ledger));
      return saveXPLedger(user.id, ledger);
    },
    onMutate: async (newLedger) => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.user(user.id) });
      const previous = queryClient.getQueryData<UserDataQueryResult>(queryKeys.user(user.id));
      
      if (previous) {
        queryClient.setQueryData<UserDataQueryResult>(queryKeys.user(user.id), {
          ...previous,
          xpLedger: newLedger,
        });
      }
      return { previous };
    },
    onError: (err, _, context) => {
      console.error('[useSaveXPLedger] Error, rolling back:', err);
      if (context?.previous && user?.id) {
        queryClient.setQueryData(queryKeys.user(user.id), context.previous);
      }
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
    },
  });
}

// Save profile
export function useSaveProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Parameters<typeof updateProfile>[1]) => {
      if (!user?.id) throw new Error('No user');
      console.log('[useSaveProfile] Saving profile updates');
      return updateProfile(user.id, updates);
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
    },
  });
}

// Delete all user data
export function useDeleteAllData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');
      console.log('[useDeleteAllData] Deleting all data for user:', user.id);
      return deleteAllUserData(user.id);
    },
    onSuccess: () => {
      if (user?.id) {
        // Clear the cache entirely for this user
        queryClient.setQueryData<UserDataQueryResult>(queryKeys.user(user.id), {
          flights: [],
          milesData: [],
          redemptions: [],
          xpLedger: {},
          profile: null,
        });
      }
    },
  });
}

// ============================================================================
// COMBINED MUTATION - For PDF Import (saves everything at once)
// ============================================================================

export interface PdfImportData {
  flights: FlightRecord[];
  activityTransactions?: ActivityTransaction[];  // New: individual transactions (optional for legacy)
  profile: Parameters<typeof updateProfile>[1];
  // Legacy fields - used when activityTransactions is not provided
  milesData?: MilesRecord[];
  xpLedger?: Record<string, XPLedgerEntry>;
}

export function usePdfImportMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: PdfImportData) => {
      if (!user?.id) throw new Error('No user');
      
      // Detect which system to use based on data provided
      const useNewSystem = Array.isArray(data.activityTransactions) && data.activityTransactions.length > 0;
      
      console.log('[usePdfImportMutation] Saving all import data:', {
        flights: data.flights.length,
        activityTransactions: data.activityTransactions?.length ?? 0,
        useNewSystem,
      });

      // Save flights
      const flightsResult = await saveFlights(user.id, data.flights);
      
      if (useNewSystem) {
        // NEW SYSTEM: Save activity transactions with deduplication
        const txResult = await upsertActivityTransactions(user.id, data.activityTransactions!);
        console.log(`[usePdfImportMutation] Transactions: ${txResult.inserted} inserted, ${txResult.skipped} skipped (duplicates)`);
        
        // Update profile (includes setting use_new_transactions = true)
        const profileResult = await updateProfile(user.id, {
          ...data.profile,
          use_new_transactions: true,  // Migrate user to new system
        });
        
        console.log('[usePdfImportMutation] All saves complete (new system)');
        return flightsResult && profileResult;
      } else {
        // LEGACY SYSTEM: Save milesData and xpLedger
        console.log('[usePdfImportMutation] Using legacy save path');
        
        if (data.milesData) {
          await saveMilesRecords(user.id, data.milesData);
        }
        if (data.xpLedger) {
          await saveXPLedger(user.id, data.xpLedger);
        }
        
        // Update profile WITHOUT setting use_new_transactions
        const profileResult = await updateProfile(user.id, data.profile);
        
        console.log('[usePdfImportMutation] All saves complete (legacy system)');
        return flightsResult && profileResult;
      }
    },
    onMutate: async (newData) => {
      if (!user?.id) return;
      
      const useNewSystem = Array.isArray(newData.activityTransactions) && newData.activityTransactions.length > 0;
      
      await queryClient.cancelQueries({ queryKey: queryKeys.user(user.id) });
      const previous = queryClient.getQueryData<UserDataQueryResult>(queryKeys.user(user.id));
      
      // Optimistically update with new data
      if (previous) {
        queryClient.setQueryData<UserDataQueryResult>(queryKeys.user(user.id), {
          ...previous,
          flights: newData.flights,
          activityTransactions: useNewSystem ? newData.activityTransactions! : previous.activityTransactions,
          // Profile updates are partial, so we merge
          profile: previous.profile ? {
            ...previous.profile,
            ...newData.profile,
            useNewTransactions: useNewSystem ? true : previous.profile.useNewTransactions,
          } : null,
        });
      }
      
      return { previous };
    },
    onError: (err, _, context) => {
      console.error('[usePdfImportMutation] Error, rolling back:', err);
      if (context?.previous && user?.id) {
        queryClient.setQueryData(queryKeys.user(user.id), context.previous);
      }
    },
    onSettled: () => {
      if (user?.id) {
        // Refetch to ensure we have the true server state
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.id) });
      }
    },
  });
}

// ============================================================================
// HELPER: Convert XP Ledger formats
// ============================================================================

export function convertToManualLedger(xpLedger: Record<string, XPLedgerEntry>): ManualLedger {
  const result: ManualLedger = {};
  Object.entries(xpLedger).forEach(([month, entry]) => {
    result[month] = {
      amexXp: entry.amexXp || 0,
      bonusSafXp: entry.bonusSafXp || 0,
      miscXp: entry.miscXp || 0,
      correctionXp: entry.correctionXp || 0,
    };
  });
  return result;
}

export function convertToXPLedger(manualLedger: ManualLedger): Record<string, XPLedgerEntry> {
  const result: Record<string, XPLedgerEntry> = {};
  Object.entries(manualLedger).forEach(([month, entry]) => {
    result[month] = {
      month,
      amexXp: entry.amexXp || 0,
      bonusSafXp: entry.bonusSafXp || 0,
      miscXp: entry.miscXp || 0,
      correctionXp: entry.correctionXp || 0,
    };
  });
  return result;
}

// src/components/MilesEngine/helpers.tsx
// Helper functions for MilesEngine

export const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const formatCPM = (cpm: number): string => {
  if (cpm === 0) return '€0.0000';
  return `€${cpm.toFixed(4)}`;
};

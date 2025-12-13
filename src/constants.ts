// src/constants.ts
// Flying Blue status thresholds and other app constants

// XP Thresholds for status levels
export const PLATINUM_THRESHOLD = 300;
export const GOLD_THRESHOLD = 180;
export const SILVER_THRESHOLD = 100;

// Ultimate Status (UXP) Constants
// Ultimate is a layer ON TOP of Platinum, requiring 900+ UXP from KLM/AF flights
export const ULTIMATE_UXP_THRESHOLD = 900;  // UXP needed for Ultimate status
export const UXP_YEARLY_CAP = 1800;         // Maximum UXP counted per qualification year
export const UXP_ROLLOVER_MAX = 900;        // Maximum UXP that can roll over to next year

// Airlines that generate UXP (only KLM and Air France flights)
export const UXP_ELIGIBLE_AIRLINES = ['KL', 'AF', 'KLM', 'AIR FRANCE', 'AIRFRANCE'];

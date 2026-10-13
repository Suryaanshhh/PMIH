// Capacity rules live here so they are easy to change (your spec says thresholds must be configurable).
export const OVER_ALLOCATION_PCT = 100; // warn when a person's total allocation goes ABOVE this
export const DEFAULT_WEEKLY_CAPACITY_HOURS = 40; // used when a resource has no availability row
import { addDays, startOfDay, format, parse, differenceInMinutes, isAfter, isBefore, isEqual } from "date-fns";

export interface TimeRange {
  date: Date;
  startTime: string; // "HH:mm" format
  endTime: string;   // "HH:mm" format
}

export interface TimeSegment extends TimeRange {
  durationMinutes: number;
  dayMinutes: number;
  eveningMinutes: number;
  nightMinutes: number;
}

export interface WorkingHourRule {
  name: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface OverlapCheckResult {
  hasOverlap: boolean;
  conflictingSegments: TimeRange[];
}

/**
 * Parse time string "HH:mm" to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Check if two time ranges overlap
 */
export function doRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Handle cross-midnight normalization for comparison
  // If end is before start, it means it crosses midnight
  const range1End = end1 <= start1 ? end1 + 1440 : end1;
  const range2End = end2 <= start2 ? end2 + 1440 : end2;
  
  return start1 < range2End && start2 < range1End;
}

/**
 * Check for overlapping time entries
 * Returns true if the new entry overlaps with any existing entry
 */
export function checkOverlap(
  newEntry: TimeRange,
  existingEntries: TimeRange[]
): OverlapCheckResult {
  const newStart = timeToMinutes(newEntry.startTime);
  const newEnd = timeToMinutes(newEntry.endTime);
  const conflictingSegments: TimeRange[] = [];

  for (const existing of existingEntries) {
    // Only check entries on the same date
    if (!isEqual(startOfDay(newEntry.date), startOfDay(existing.date))) {
      continue;
    }

    const existStart = timeToMinutes(existing.startTime);
    const existEnd = timeToMinutes(existing.endTime);

    if (doRangesOverlap(newStart, newEnd, existStart, existEnd)) {
      conflictingSegments.push(existing);
    }
  }

  return {
    hasOverlap: conflictingSegments.length > 0,
    conflictingSegments,
  };
}

/**
 * Split a time entry that crosses midnight into multiple daily segments
 * Example: Saturday 21:00 -> Sunday 02:00 becomes:
 *   - Saturday: 21:00-24:00 (180 min)
 *   - Sunday: 00:00-02:00 (120 min)
 */
export function splitCrossMidnight(
  date: Date,
  startTime: string,
  endTime: string
): TimeRange[] {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // If end time is after or equal to start time on the same day, no split needed
  if (endMinutes > startMinutes) {
    return [{ date, startTime, endTime }];
  }
  
  // Entry crosses midnight - split into two segments
  const segments: TimeRange[] = [];
  
  // First day: startTime to 24:00
  segments.push({
    date: startOfDay(date),
    startTime,
    endTime: "24:00",
  });
  
  // Next day: 00:00 to endTime
  segments.push({
    date: startOfDay(addDays(date, 1)),
    startTime: "00:00",
    endTime,
  });
  
  return segments;
}

/**
 * Calculate the duration of a time range in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  // Handle "24:00" as midnight
  if (endTime === "24:00") {
    endMinutes = 1440;
  }
  
  // Handle cross-midnight
  if (endMinutes <= startMinutes) {
    endMinutes += 1440;
  }
  
  return endMinutes - startMinutes;
}

/**
 * Calculate overlap between a time range and a working hour rule
 * Returns minutes of overlap
 */
function calculateRuleOverlap(
  entryStart: number,
  entryEnd: number,
  ruleStart: number,
  ruleEnd: number
): number {
  // Handle cross-midnight rules (e.g., Night: 22:00-08:00)
  if (ruleEnd < ruleStart) {
    // Split the rule into two parts: ruleStart-24:00 and 00:00-ruleEnd
    const part1 = calculateRuleOverlap(entryStart, entryEnd, ruleStart, 1440);
    const part2 = calculateRuleOverlap(entryStart, entryEnd, 0, ruleEnd);
    return part1 + part2;
  }
  
  // Calculate overlap
  const overlapStart = Math.max(entryStart, ruleStart);
  const overlapEnd = Math.min(entryEnd, ruleEnd);
  
  if (overlapStart >= overlapEnd) {
    return 0;
  }
  
  return overlapEnd - overlapStart;
}

/**
 * Calculate day, evening, and night hours for a time entry
 * Based on configurable working hour rules
 */
export function calculateHourTypes(
  startTime: string,
  endTime: string,
  rules: WorkingHourRule[]
): { dayMinutes: number; eveningMinutes: number; nightMinutes: number } {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  // Handle "24:00" as midnight
  if (endTime === "24:00") {
    endMinutes = 1440;
  }
  
  // Handle entries that don't cross midnight in this segment
  // (cross-midnight entries should be split first)
  if (endMinutes <= startMinutes) {
    endMinutes += 1440;
  }
  
  let dayMinutes = 0;
  let eveningMinutes = 0;
  let nightMinutes = 0;
  
  for (const rule of rules) {
    const ruleStart = timeToMinutes(rule.startTime);
    const ruleEnd = timeToMinutes(rule.endTime);
    const overlap = calculateRuleOverlap(startMinutes, endMinutes, ruleStart, ruleEnd);
    
    switch (rule.name.toLowerCase()) {
      case "day":
        dayMinutes += overlap;
        break;
      case "evening":
        eveningMinutes += overlap;
        break;
      case "night":
        nightMinutes += overlap;
        break;
    }
  }
  
  return { dayMinutes, eveningMinutes, nightMinutes };
}

/**
 * Validate that a date is within the allowed backdate limit
 */
export function validateBackdateLimit(
  entryDate: Date,
  backdateLimitDays: number,
  currentDate: Date = new Date()
): { valid: boolean; message?: string } {
  const today = startOfDay(currentDate);
  const entryDay = startOfDay(entryDate);
  
  // Check if it's a future date
  if (isAfter(entryDay, today)) {
    return {
      valid: false,
      message: "Cannot create time entries for future dates",
    };
  }
  
  // Calculate the earliest allowed date
  const earliestAllowed = addDays(today, -backdateLimitDays);
  
  if (isBefore(entryDay, startOfDay(earliestAllowed))) {
    return {
      valid: false,
      message: `Cannot create time entries older than ${backdateLimitDays} days`,
    };
  }
  
  return { valid: true };
}

/**
 * Process a time entry: split if needed, calculate hours
 */
export function processTimeEntry(
  date: Date,
  startTime: string,
  endTime: string,
  rules: WorkingHourRule[]
): TimeSegment[] {
  // First, split if crossing midnight
  const ranges = splitCrossMidnight(date, startTime, endTime);
  
  // Then calculate hour types for each segment
  return ranges.map((range) => {
    const duration = calculateDuration(range.startTime, range.endTime);
    const hourTypes = calculateHourTypes(range.startTime, range.endTime, rules);
    
    return {
      ...range,
      durationMinutes: duration,
      ...hourTypes,
    };
  });
}

/**
 * Format a time entry for display
 */
export function formatTimeEntry(segment: TimeSegment): string {
  const dateStr = format(segment.date, "yyyy-MM-dd");
  return `${dateStr} ${segment.startTime}-${segment.endTime} (${segment.durationMinutes}min: Day=${segment.dayMinutes}, Evening=${segment.eveningMinutes}, Night=${segment.nightMinutes})`;
}

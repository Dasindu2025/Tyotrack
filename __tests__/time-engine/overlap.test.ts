import { describe, it, expect } from "vitest";
import { checkOverlap, doRangesOverlap, timeToMinutes } from "../src/lib/time-engine";

describe("Overlap Prevention", () => {
  describe("doRangesOverlap", () => {
    it("should detect overlapping ranges", () => {
      // 09:00-12:00 overlaps with 10:00-14:00
      const start1 = timeToMinutes("09:00"); // 540
      const end1 = timeToMinutes("12:00");   // 720
      const start2 = timeToMinutes("10:00"); // 600
      const end2 = timeToMinutes("14:00");   // 840
      
      expect(doRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it("should detect when one range contains another", () => {
      // 08:00-18:00 contains 10:00-14:00
      const start1 = timeToMinutes("08:00");
      const end1 = timeToMinutes("18:00");
      const start2 = timeToMinutes("10:00");
      const end2 = timeToMinutes("14:00");
      
      expect(doRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it("should NOT detect overlap for adjacent ranges", () => {
      // 09:00-12:00 and 12:00-15:00 are adjacent, not overlapping
      const start1 = timeToMinutes("09:00");
      const end1 = timeToMinutes("12:00");
      const start2 = timeToMinutes("12:00");
      const end2 = timeToMinutes("15:00");
      
      expect(doRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it("should NOT detect overlap for non-overlapping ranges", () => {
      // 09:00-12:00 and 14:00-17:00 don't overlap
      const start1 = timeToMinutes("09:00");
      const end1 = timeToMinutes("12:00");
      const start2 = timeToMinutes("14:00");
      const end2 = timeToMinutes("17:00");
      
      expect(doRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it("should detect overlap when ranges have the same start time", () => {
      // Both start at 09:00
      const start1 = timeToMinutes("09:00");
      const end1 = timeToMinutes("12:00");
      const start2 = timeToMinutes("09:00");
      const end2 = timeToMinutes("10:00");
      
      expect(doRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it("should detect partial overlap at start", () => {
      // 10:00-14:00 overlaps with 08:00-11:00
      const start1 = timeToMinutes("10:00");
      const end1 = timeToMinutes("14:00");
      const start2 = timeToMinutes("08:00");
      const end2 = timeToMinutes("11:00");
      
      expect(doRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });
  });

  describe("checkOverlap", () => {
    it("should find no overlap when no existing entries", () => {
      const newEntry = {
        date: new Date("2024-01-15"),
        startTime: "09:00",
        endTime: "12:00",
      };
      
      const result = checkOverlap(newEntry, []);
      
      expect(result.hasOverlap).toBe(false);
      expect(result.conflictingSegments).toHaveLength(0);
    });

    it("should find overlap with existing entry on same date", () => {
      const newEntry = {
        date: new Date("2024-01-15"),
        startTime: "10:00",
        endTime: "14:00",
      };
      
      const existingEntries = [
        {
          date: new Date("2024-01-15"),
          startTime: "09:00",
          endTime: "12:00",
        },
      ];
      
      const result = checkOverlap(newEntry, existingEntries);
      
      expect(result.hasOverlap).toBe(true);
      expect(result.conflictingSegments).toHaveLength(1);
    });

    it("should NOT find overlap with entry on different date", () => {
      const newEntry = {
        date: new Date("2024-01-15"),
        startTime: "10:00",
        endTime: "14:00",
      };
      
      const existingEntries = [
        {
          date: new Date("2024-01-16"),
          startTime: "10:00",
          endTime: "14:00",
        },
      ];
      
      const result = checkOverlap(newEntry, existingEntries);
      
      expect(result.hasOverlap).toBe(false);
    });

    it("should find multiple overlapping entries", () => {
      const newEntry = {
        date: new Date("2024-01-15"),
        startTime: "09:00",
        endTime: "18:00",
      };
      
      const existingEntries = [
        {
          date: new Date("2024-01-15"),
          startTime: "10:00",
          endTime: "11:00",
        },
        {
          date: new Date("2024-01-15"),
          startTime: "14:00",
          endTime: "16:00",
        },
      ];
      
      const result = checkOverlap(newEntry, existingEntries);
      
      expect(result.hasOverlap).toBe(true);
      expect(result.conflictingSegments).toHaveLength(2);
    });
  });
});

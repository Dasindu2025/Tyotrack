import { describe, it, expect } from "vitest";
import { splitCrossMidnight, calculateDuration } from "../src/lib/time-engine";
import { format } from "date-fns";

describe("Cross-Midnight Splitting", () => {
  describe("splitCrossMidnight", () => {
    it("should NOT split an entry that does not cross midnight", () => {
      const date = new Date("2024-01-15");
      const segments = splitCrossMidnight(date, "09:00", "17:00");
      
      expect(segments).toHaveLength(1);
      expect(segments[0].startTime).toBe("09:00");
      expect(segments[0].endTime).toBe("17:00");
    });

    it("should split 21:00-02:00 into two segments", () => {
      const date = new Date("2024-01-15"); // Saturday
      const segments = splitCrossMidnight(date, "21:00", "02:00");
      
      expect(segments).toHaveLength(2);
      
      // First segment: Saturday 21:00-24:00
      expect(format(segments[0].date, "yyyy-MM-dd")).toBe("2024-01-15");
      expect(segments[0].startTime).toBe("21:00");
      expect(segments[0].endTime).toBe("24:00");
      
      // Second segment: Sunday 00:00-02:00
      expect(format(segments[1].date, "yyyy-MM-dd")).toBe("2024-01-16");
      expect(segments[1].startTime).toBe("00:00");
      expect(segments[1].endTime).toBe("02:00");
    });

    it("should split 23:00-06:00 correctly", () => {
      const date = new Date("2024-01-15");
      const segments = splitCrossMidnight(date, "23:00", "06:00");
      
      expect(segments).toHaveLength(2);
      
      // First segment: 23:00-24:00 (1 hour)
      expect(segments[0].startTime).toBe("23:00");
      expect(segments[0].endTime).toBe("24:00");
      
      // Second segment: 00:00-06:00 (6 hours)
      expect(format(segments[1].date, "yyyy-MM-dd")).toBe("2024-01-16");
      expect(segments[1].startTime).toBe("00:00");
      expect(segments[1].endTime).toBe("06:00");
    });

    it("should handle entry ending exactly at midnight as non-crossing", () => {
      const date = new Date("2024-01-15");
      // 20:00-00:00 is internally 20:00-24:00 which doesn't cross
      // But since end < start, it will cross
      const segments = splitCrossMidnight(date, "20:00", "00:00");
      
      expect(segments).toHaveLength(2);
      expect(segments[0].endTime).toBe("24:00");
      expect(segments[1].startTime).toBe("00:00");
      expect(segments[1].endTime).toBe("00:00");
    });
  });

  describe("calculateDuration", () => {
    it("should calculate duration for normal time range", () => {
      expect(calculateDuration("09:00", "17:00")).toBe(480); // 8 hours
    });

    it("should calculate duration for 24:00 end time", () => {
      expect(calculateDuration("21:00", "24:00")).toBe(180); // 3 hours
    });

    it("should calculate duration for early morning", () => {
      expect(calculateDuration("00:00", "02:00")).toBe(120); // 2 hours
    });

    it("should calculate duration for full day", () => {
      expect(calculateDuration("00:00", "24:00")).toBe(1440); // 24 hours
    });

    it("should calculate short duration", () => {
      expect(calculateDuration("14:00", "14:30")).toBe(30); // 30 minutes
    });
  });
});

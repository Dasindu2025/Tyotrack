import { describe, it, expect } from "vitest";
import { calculateHourTypes, WorkingHourRule } from "../src/lib/time-engine";

// Standard working hour rules for testing
const standardRules: WorkingHourRule[] = [
  { name: "Day", startTime: "08:00", endTime: "18:00" },
  { name: "Evening", startTime: "18:00", endTime: "22:00" },
  { name: "Night", startTime: "22:00", endTime: "08:00" },
];

describe("Day/Evening/Night Calculation", () => {
  describe("calculateHourTypes", () => {
    it("should calculate pure day hours (09:00-17:00)", () => {
      const result = calculateHourTypes("09:00", "17:00", standardRules);
      
      expect(result.dayMinutes).toBe(480); // 8 hours of day work
      expect(result.eveningMinutes).toBe(0);
      expect(result.nightMinutes).toBe(0);
    });

    it("should calculate work spanning day into evening (09:00-20:00)", () => {
      const result = calculateHourTypes("09:00", "20:00", standardRules);
      
      // Day: 09:00-18:00 = 9 hours = 540 minutes
      // Evening: 18:00-20:00 = 2 hours = 120 minutes
      expect(result.dayMinutes).toBe(540);
      expect(result.eveningMinutes).toBe(120);
      expect(result.nightMinutes).toBe(0);
    });

    it("should calculate pure evening hours (18:00-22:00)", () => {
      const result = calculateHourTypes("18:00", "22:00", standardRules);
      
      expect(result.dayMinutes).toBe(0);
      expect(result.eveningMinutes).toBe(240); // 4 hours
      expect(result.nightMinutes).toBe(0);
    });

    it("should calculate night hours (22:00-24:00)", () => {
      const result = calculateHourTypes("22:00", "24:00", standardRules);
      
      expect(result.dayMinutes).toBe(0);
      expect(result.eveningMinutes).toBe(0);
      expect(result.nightMinutes).toBe(120); // 2 hours
    });

    it("should calculate early morning night hours (00:00-06:00)", () => {
      const result = calculateHourTypes("00:00", "06:00", standardRules);
      
      // Night extends from 22:00 to 08:00, so 00:00-06:00 is all night
      expect(result.dayMinutes).toBe(0);
      expect(result.eveningMinutes).toBe(0);
      expect(result.nightMinutes).toBe(360); // 6 hours
    });

    it("should calculate work spanning night into day (06:00-10:00)", () => {
      const result = calculateHourTypes("06:00", "10:00", standardRules);
      
      // Night: 06:00-08:00 = 2 hours = 120 minutes
      // Day: 08:00-10:00 = 2 hours = 120 minutes
      expect(result.nightMinutes).toBe(120);
      expect(result.dayMinutes).toBe(120);
      expect(result.eveningMinutes).toBe(0);
    });

    it("should calculate work spanning evening into night (20:00-23:00)", () => {
      const result = calculateHourTypes("20:00", "23:00", standardRules);
      
      // Evening: 20:00-22:00 = 2 hours = 120 minutes
      // Night: 22:00-23:00 = 1 hour = 60 minutes
      expect(result.dayMinutes).toBe(0);
      expect(result.eveningMinutes).toBe(120);
      expect(result.nightMinutes).toBe(60);
    });

    it("should calculate work spanning all three periods (07:00-23:00)", () => {
      const result = calculateHourTypes("07:00", "23:00", standardRules);
      
      // Night: 07:00-08:00 = 1 hour = 60 minutes
      // Day: 08:00-18:00 = 10 hours = 600 minutes
      // Evening: 18:00-22:00 = 4 hours = 240 minutes
      // Night: 22:00-23:00 = 1 hour = 60 minutes
      expect(result.nightMinutes).toBe(120); // 60 before 8am + 60 after 10pm
      expect(result.dayMinutes).toBe(600);
      expect(result.eveningMinutes).toBe(240);
    });

    it("should handle exact boundary times", () => {
      // Exactly 08:00-18:00 (day boundary)
      const result = calculateHourTypes("08:00", "18:00", standardRules);
      
      expect(result.dayMinutes).toBe(600); // 10 hours
      expect(result.eveningMinutes).toBe(0);
      expect(result.nightMinutes).toBe(0);
    });

    it("should handle short periods within one type", () => {
      // 10:00-10:30 - just 30 minutes of day work
      const result = calculateHourTypes("10:00", "10:30", standardRules);
      
      expect(result.dayMinutes).toBe(30);
      expect(result.eveningMinutes).toBe(0);
      expect(result.nightMinutes).toBe(0);
    });
  });
});

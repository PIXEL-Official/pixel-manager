import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  hasSevenDaysPassed,
  isWarningTime,
  getDaysUntilDeadline,
  meetsWeeklyRequirement,
  formatMinutes,
  parseISODate,
  calculateMinutesBetween,
} from '../../utils/dateHelper';

describe('dateHelper', () => {
  describe('getWeekStart', () => {
    it('should return the same date as reference', () => {
      const referenceDate = new Date('2024-01-15T10:00:00.000Z');
      const result = getWeekStart(referenceDate);
      expect(result).toEqual(referenceDate);
    });
  });

  describe('hasSevenDaysPassed', () => {
    it('should return false if less than 7 days have passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-20T10:00:00.000Z'); // 5 days later
      expect(hasSevenDaysPassed(startDate, now)).toBe(false);
    });

    it('should return true if exactly 7 days have passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-22T10:00:00.000Z'); // 7 days later
      expect(hasSevenDaysPassed(startDate, now)).toBe(true);
    });

    it('should return true if more than 7 days have passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-25T10:00:00.000Z'); // 10 days later
      expect(hasSevenDaysPassed(startDate, now)).toBe(true);
    });
  });

  describe('isWarningTime', () => {
    it('should return false if less than 6 days have passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-20T10:00:00.000Z'); // 5 days later
      expect(isWarningTime(startDate, now)).toBe(false);
    });

    it('should return true if exactly 6 days have passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-21T10:00:00.000Z'); // 6 days later
      expect(isWarningTime(startDate, now)).toBe(true);
    });

    it('should return true if 6.5 days have passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-21T22:00:00.000Z'); // 6.5 days later
      expect(isWarningTime(startDate, now)).toBe(true);
    });

    it('should return false if 7 or more days have passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-22T10:00:00.000Z'); // 7 days later
      expect(isWarningTime(startDate, now)).toBe(false);
    });
  });

  describe('getDaysUntilDeadline', () => {
    it('should return correct days remaining', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-20T10:00:00.000Z'); // 5 days after start, 2 days until deadline
      expect(getDaysUntilDeadline(startDate, now)).toBe(2);
    });

    it('should return 0 if deadline has passed', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-25T10:00:00.000Z'); // 10 days after start
      expect(getDaysUntilDeadline(startDate, now)).toBe(0);
    });

    it('should return 7 if called immediately after start', () => {
      const startDate = new Date('2024-01-15T10:00:00.000Z');
      const now = new Date('2024-01-15T10:00:01.000Z'); // 1 second after start
      expect(getDaysUntilDeadline(startDate, now)).toBe(7);
    });
  });

  describe('meetsWeeklyRequirement', () => {
    it('should return true if total minutes >= 30', () => {
      expect(meetsWeeklyRequirement(30)).toBe(true);
      expect(meetsWeeklyRequirement(50)).toBe(true);
      expect(meetsWeeklyRequirement(100)).toBe(true);
    });

    it('should return false if total minutes < 30', () => {
      expect(meetsWeeklyRequirement(0)).toBe(false);
      expect(meetsWeeklyRequirement(15)).toBe(false);
      expect(meetsWeeklyRequirement(29)).toBe(false);
    });
  });

  describe('formatMinutes', () => {
    it('should format minutes correctly when only minutes', () => {
      expect(formatMinutes(0)).toBe('0분');
      expect(formatMinutes(15)).toBe('15분');
      expect(formatMinutes(59)).toBe('59분');
    });

    it('should format minutes correctly when hours and minutes', () => {
      expect(formatMinutes(60)).toBe('1시간 0분');
      expect(formatMinutes(75)).toBe('1시간 15분');
      expect(formatMinutes(125)).toBe('2시간 5분');
      expect(formatMinutes(180)).toBe('3시간 0분');
    });
  });

  describe('parseISODate', () => {
    it('should parse ISO string to Date object', () => {
      const isoString = '2024-01-15T10:00:00.000Z';
      const result = parseISODate(isoString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(isoString);
    });
  });

  describe('calculateMinutesBetween', () => {
    it('should calculate minutes between two dates', () => {
      const start = new Date('2024-01-15T10:00:00.000Z');
      const end = new Date('2024-01-15T11:30:00.000Z'); // 90 minutes later
      expect(calculateMinutesBetween(start, end)).toBe(90);
    });

    it('should return 0 if dates are the same', () => {
      const date = new Date('2024-01-15T10:00:00.000Z');
      expect(calculateMinutesBetween(date, date)).toBe(0);
    });

    it('should handle partial minutes (floor)', () => {
      const start = new Date('2024-01-15T10:00:00.000Z');
      const end = new Date('2024-01-15T10:01:30.000Z'); // 1.5 minutes later
      expect(calculateMinutesBetween(start, end)).toBe(1); // floor to 1
    });
  });
});


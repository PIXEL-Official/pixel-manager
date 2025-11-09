import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase first
vi.mock('../../database/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

import { StatsService, statsService } from '../../services/statsService';

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(() => {
    service = new StatsService();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(service).toBeInstanceOf(StatsService);
    });
  });

  describe('singleton instance', () => {
    it('should export statsService instance', () => {
      expect(statsService).toBeInstanceOf(StatsService);
    });
  });

  describe('methods', () => {
    it('should have getOverallStats method', () => {
      expect(typeof service.getOverallStats).toBe('function');
    });

    it('should have generateWeeklyReport method', () => {
      expect(typeof service.generateWeeklyReport).toBe('function');
    });

    it('should have getUserDetailedStats method', () => {
      expect(typeof service.getUserDetailedStats).toBe('function');
    });

    it('should have getRiskyUsers method', () => {
      expect(typeof service.getRiskyUsers).toBe('function');
    });

    it('should have getSessionStatsByDateRange method', () => {
      expect(typeof service.getSessionStatsByDateRange).toBe('function');
    });
  });
});

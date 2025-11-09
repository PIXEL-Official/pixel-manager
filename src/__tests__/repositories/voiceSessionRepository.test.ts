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

import { VoiceSessionRepository } from '../../repositories/voiceSessionRepository';

describe('VoiceSessionRepository', () => {
  let repository: VoiceSessionRepository;

  beforeEach(() => {
    repository = new VoiceSessionRepository();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(repository).toBeInstanceOf(VoiceSessionRepository);
    });
  });

  describe('methods', () => {
    it('should have createSession method', () => {
      expect(typeof repository.createSession).toBe('function');
    });

    it('should have getUserSessions method', () => {
      expect(typeof repository.getUserSessions).toBe('function');
    });

    it('should have getSessionsByDateRange method', () => {
      expect(typeof repository.getSessionsByDateRange).toBe('function');
    });

    it('should have getWeeklySessions method', () => {
      expect(typeof repository.getWeeklySessions).toBe('function');
    });

    it('should have getTotalMinutes method', () => {
      expect(typeof repository.getTotalMinutes).toBe('function');
    });

    it('should have getAllSessionStats method', () => {
      expect(typeof repository.getAllSessionStats).toBe('function');
    });

    it('should have deleteOldSessions method', () => {
      expect(typeof repository.deleteOldSessions).toBe('function');
    });
  });
});

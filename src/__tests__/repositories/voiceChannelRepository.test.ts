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

import { VoiceChannelRepository } from '../../repositories/voiceChannelRepository';

describe('VoiceChannelRepository', () => {
  let repository: VoiceChannelRepository;

  beforeEach(() => {
    repository = new VoiceChannelRepository();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(repository).toBeInstanceOf(VoiceChannelRepository);
    });
  });

  describe('methods', () => {
    it('should have addChannel method', () => {
      expect(typeof repository.addChannel).toBe('function');
    });

    it('should have getChannelById method', () => {
      expect(typeof repository.getChannelById).toBe('function');
    });

    it('should have getActiveChannels method', () => {
      expect(typeof repository.getActiveChannels).toBe('function');
    });

    it('should have getAllChannels method', () => {
      expect(typeof repository.getAllChannels).toBe('function');
    });

    it('should have removeChannel method', () => {
      expect(typeof repository.removeChannel).toBe('function');
    });

    it('should have deleteChannel method', () => {
      expect(typeof repository.deleteChannel).toBe('function');
    });

    it('should have reactivateChannel method', () => {
      expect(typeof repository.reactivateChannel).toBe('function');
    });

    it('should have updateChannelName method', () => {
      expect(typeof repository.updateChannelName).toBe('function');
    });

    it('should have isTrackedChannel method', () => {
      expect(typeof repository.isTrackedChannel).toBe('function');
    });
  });
});

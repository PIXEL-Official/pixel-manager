import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceTracker } from '../../services/voiceTracker';

describe('VoiceTracker', () => {
  let voiceTracker: VoiceTracker;
  const testGuildId = 'test-guild-123';

  beforeEach(() => {
    voiceTracker = new VoiceTracker(testGuildId);
  });

  describe('constructor', () => {
    it('should initialize with guild ID', () => {
      expect(voiceTracker).toBeInstanceOf(VoiceTracker);
    });
  });

  describe('isTrackedChannel', () => {
    it('should return false for null channel', () => {
      expect(voiceTracker.isTrackedChannel(null)).toBe(false);
    });

    it('should return false for untracked channel', () => {
      expect(voiceTracker.isTrackedChannel('untracked-123')).toBe(false);
    });

    it('should return true after adding tracked channel', () => {
      const channelId = 'channel-123';
      voiceTracker.addTrackedChannel(channelId);
      expect(voiceTracker.isTrackedChannel(channelId)).toBe(true);
    });
  });

  describe('addTrackedChannel', () => {
    it('should add channel to tracked list', () => {
      const channelId = 'channel-456';
      voiceTracker.addTrackedChannel(channelId);
      expect(voiceTracker.isTrackedChannel(channelId)).toBe(true);
    });
  });

  describe('removeTrackedChannel', () => {
    it('should remove channel from tracked list', () => {
      const channelId = 'channel-789';
      voiceTracker.addTrackedChannel(channelId);
      expect(voiceTracker.isTrackedChannel(channelId)).toBe(true);
      
      voiceTracker.removeTrackedChannel(channelId);
      expect(voiceTracker.isTrackedChannel(channelId)).toBe(false);
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return 0 initially', () => {
      expect(voiceTracker.getActiveSessionCount()).toBe(0);
    });
  });

  describe('getCurrentSessionMinutes', () => {
    it('should return 0 for user without session', () => {
      expect(voiceTracker.getCurrentSessionMinutes('user-123')).toBe(0);
    });
  });

  describe('getActiveSession', () => {
    it('should return undefined for user without session', () => {
      expect(voiceTracker.getActiveSession('user-123')).toBeUndefined();
    });
  });

  describe('getAllActiveSessions', () => {
    it('should return a Map', () => {
      const sessions = voiceTracker.getAllActiveSessions();
      expect(sessions).toBeInstanceOf(Map);
    });
  });
});

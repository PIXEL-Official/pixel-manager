import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger first
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Supabase
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockEq = vi.fn(() => ({ select: mockSelect, single: mockSingle }));
const mockUpsert = vi.fn(() => ({ select: mockSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockDelete = vi.fn(() => ({ eq: mockEq }));

vi.mock('../../database/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
    })),
  },
}));

import { kickSettingsRepository } from '../../repositories/kickSettingsRepository';

describe('KickSettingsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return settings from database', async () => {
      const mockSettings = {
        guild_id: 'test-guild',
        kick_days: 7,
        warning_days: 6,
        required_minutes: 30,
        require_camera_on: true,
        require_voice_presence: false,
      };

      mockSingle.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const result = await kickSettingsRepository.getSettings('test-guild');

      expect(result).toEqual(mockSettings);
    });

    it('should return default settings when not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await kickSettingsRepository.getSettings('test-guild');
      
      expect(result).toEqual({
        guild_id: 'test-guild',
        kick_days: 7,
        warning_days: 6,
        required_minutes: 30,
        require_camera_on: false,
        require_voice_presence: false,
      });
    });

    it('should return default settings on error', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Database error'));

      const result = await kickSettingsRepository.getSettings('test-guild');
      
      expect(result).toEqual({
        guild_id: 'test-guild',
        kick_days: 7,
        warning_days: 6,
        required_minutes: 30,
        require_camera_on: false,
        require_voice_presence: false,
      });
    });
  });

  describe('upsertSettings', () => {
    it('should upsert settings successfully', async () => {
      const mockSettings = {
        guild_id: 'test-guild',
        kick_days: 10,
        warning_days: 8,
        required_minutes: 60,
        require_camera_on: true,
        require_voice_presence: true,
      };

      mockSingle.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const result = await kickSettingsRepository.upsertSettings(mockSettings);
      
      expect(result).toEqual(mockSettings);
    });

    it('should return null on error', async () => {
      const mockSettings = {
        guild_id: 'test-guild',
        kick_days: 10,
        warning_days: 8,
        required_minutes: 60,
        require_camera_on: true,
        require_voice_presence: true,
      };

      mockSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await kickSettingsRepository.upsertSettings(mockSettings);
      
      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const mockUpdatedSettings = {
        guild_id: 'test-guild',
        kick_days: 10,
        warning_days: 6,
        required_minutes: 30,
        require_camera_on: false,
        require_voice_presence: false,
      };

      mockSingle.mockResolvedValueOnce({
        data: mockUpdatedSettings,
        error: null,
      });

      const result = await kickSettingsRepository.updateSettings('test-guild', {
        kick_days: 10,
      });
      
      expect(result).toEqual(mockUpdatedSettings);
    });

    it('should return null on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await kickSettingsRepository.updateSettings('test-guild', {
        kick_days: 10,
      });
      
      expect(result).toBeNull();
    });
  });

  describe('deleteSettings', () => {
    it('should delete settings successfully', async () => {
      // For delete, mockEq returns a Promise directly (not a chain)
      (mockEq as any).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await kickSettingsRepository.deleteSettings('test-guild');
      
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      (mockEq as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await kickSettingsRepository.deleteSettings('test-guild');
      
      expect(result).toBe(false);
    });
  });
});


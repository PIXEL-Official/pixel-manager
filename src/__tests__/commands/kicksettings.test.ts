import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatInputCommandInteraction } from 'discord.js';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock kickSettingsRepository
vi.mock('../../repositories/kickSettingsRepository', () => ({
  kickSettingsRepository: {
    getSettings: vi.fn(),
    upsertSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

import * as kicksettingsCommand from '../../commands/kicksettings';
import { kickSettingsRepository } from '../../repositories/kickSettingsRepository';

describe('kicksettings command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReply = vi.fn();
    mockInteraction = {
      guildId: 'test-guild',
      reply: mockReply,
      options: {
        getSubcommand: vi.fn(),
        getInteger: vi.fn(),
      } as any,
    } as any;
  });

  describe('view subcommand', () => {
    it('should display current settings', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('view');
      vi.mocked(kickSettingsRepository.getSettings).mockResolvedValue({
        guild_id: 'test-guild',
        kick_days: 7,
        warning_days: 6,
        required_minutes: 30,
      });

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(kickSettingsRepository.getSettings).toHaveBeenCalledWith('test-guild');
      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '⚙️ 킥 설정',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('set subcommand', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('set');
      vi.mocked(kickSettingsRepository.getSettings).mockResolvedValue({
        guild_id: 'test-guild',
        kick_days: 7,
        warning_days: 6,
        required_minutes: 30,
      });
    });

    it('should update kick_days only', async () => {
      (mockInteraction.options!.getInteger as any).mockImplementation((name: string) => {
        if (name === 'kick_days') return 10;
        return null;
      });

      vi.mocked(kickSettingsRepository.upsertSettings).mockResolvedValue({
        guild_id: 'test-guild',
        kick_days: 10,
        warning_days: 6,
        required_minutes: 30,
      });

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(kickSettingsRepository.upsertSettings).toHaveBeenCalledWith({
        guild_id: 'test-guild',
        kick_days: 10,
        warning_days: 6,
        required_minutes: 30,
      });
      expect(mockReply).toHaveBeenCalled();
    });

    it('should update multiple settings', async () => {
      (mockInteraction.options!.getInteger as any).mockImplementation((name: string) => {
        if (name === 'kick_days') return 10;
        if (name === 'warning_days') return 8;
        if (name === 'required_minutes') return 60;
        return null;
      });

      vi.mocked(kickSettingsRepository.upsertSettings).mockResolvedValue({
        guild_id: 'test-guild',
        kick_days: 10,
        warning_days: 8,
        required_minutes: 60,
      });

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(kickSettingsRepository.upsertSettings).toHaveBeenCalledWith({
        guild_id: 'test-guild',
        kick_days: 10,
        warning_days: 8,
        required_minutes: 60,
      });
    });

    it('should reject when warning_days >= kick_days', async () => {
      (mockInteraction.options!.getInteger as any).mockImplementation((name: string) => {
        if (name === 'kick_days') return 7;
        if (name === 'warning_days') return 8;
        return null;
      });

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('작아야 합니다'),
          ephemeral: true,
        })
      );
      expect(kickSettingsRepository.upsertSettings).not.toHaveBeenCalled();
    });

    it('should reject when kick_days < 1', async () => {
      (mockInteraction.options!.getInteger as any).mockImplementation((name: string) => {
        if (name === 'kick_days') return 0;
        return null;
      });

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('1일 이상'),
          ephemeral: true,
        })
      );
      expect(kickSettingsRepository.upsertSettings).not.toHaveBeenCalled();
    });

    it('should reject when no options provided', async () => {
      (mockInteraction.options!.getInteger as any).mockReturnValue(null);

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('최소한 하나의 설정'),
          ephemeral: true,
        })
      );
    });
  });

  describe('reset subcommand', () => {
    it('should reset settings to default', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('reset');
      vi.mocked(kickSettingsRepository.upsertSettings).mockResolvedValue({
        guild_id: 'test-guild',
        kick_days: 7,
        warning_days: 6,
        required_minutes: 30,
      });

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(kickSettingsRepository.upsertSettings).toHaveBeenCalledWith({
        guild_id: 'test-guild',
        kick_days: 7,
        warning_days: 6,
        required_minutes: 30,
      });
      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🔄 설정이 초기화되었습니다',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing guild ID', async () => {
      mockInteraction.guildId = null;

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('서버에서만'),
          ephemeral: true,
        })
      );
    });

    it('should handle unknown subcommand', async () => {
      (mockInteraction.options!.getSubcommand as any).mockReturnValue('unknown');

      await kicksettingsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('알 수 없는'),
          ephemeral: true,
        })
      );
    });
  });
});


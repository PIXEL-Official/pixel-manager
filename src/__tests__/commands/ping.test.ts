import { describe, it, expect, beforeEach, vi } from 'vitest';
import { data, execute } from '../../commands/ping';
import { SlashCommandBuilder } from 'discord.js';

describe('Ping Command', () => {
  let mockInteraction: any;

  beforeEach(() => {
    mockInteraction = {
      reply: vi.fn().mockResolvedValue(undefined),
    };
    vi.clearAllMocks();
  });

  describe('data', () => {
    it('should have correct command name', () => {
      expect(data.name).toBe('ping');
    });

    it('should have correct command description', () => {
      expect(data.description).toBe('Replies with Pong!');
    });

    it('should be a SlashCommandBuilder instance', () => {
      expect(data).toBeInstanceOf(SlashCommandBuilder);
    });
  });

  describe('execute', () => {
    it('should reply with Pong message', async () => {
      await execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith('Pong! 🏓');
      expect(mockInteraction.reply).toHaveBeenCalledTimes(1);
    });
  });
});

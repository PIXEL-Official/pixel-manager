import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KickChecker } from '../../services/kickChecker';
import { VoiceTracker } from '../../services/voiceTracker';
import { userRepository } from '../../repositories/userRepository';
import * as dateHelper from '../../utils/dateHelper';

// Mock Supabase first to avoid initialization errors
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

// Mock repositories
vi.mock('../../repositories/userRepository', () => ({
  userRepository: {
    getUsersToCheck: vi.fn(),
    updateUser: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    checkStarted: vi.fn(),
    checkCompleted: vi.fn(),
    warningSent: vi.fn(),
    warningFailed: vi.fn(),
    userKicked: vi.fn(),
    kickFailed: vi.fn(),
  },
}));

describe('KickChecker - Core Logic', () => {
  let kickChecker: KickChecker;
  let mockClient: any;
  let mockVoiceTracker: VoiceTracker;
  let mockGuild: any;
  let mockMember: any;
  const testGuildId = 'test-guild-123';

  beforeEach(() => {
    // Mock Discord.js client
    mockMember = {
      send: vi.fn().mockResolvedValue(undefined),
      kick: vi.fn().mockResolvedValue(undefined),
    };

    mockGuild = {
      members: {
        fetch: vi.fn().mockResolvedValue(mockMember),
      },
    };

    mockClient = {
      guilds: {
        fetch: vi.fn().mockResolvedValue(mockGuild),
      },
    };

    mockVoiceTracker = new VoiceTracker(testGuildId);
    kickChecker = new KickChecker(mockClient, testGuildId, mockVoiceTracker);

    vi.clearAllMocks();
  });

  describe('Kick Logic - 7일 경과 + 30분 미달', () => {
    it('should kick user when 7 days passed and total minutes < 30', async () => {
      // Mock date helper functions
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'hasDaysPassed').mockReturnValue(true); // kick_days 경과
      vi.spyOn(dateHelper, 'isWarningTimeWithDays').mockReturnValue(false);
      vi.spyOn(dateHelper, 'meetsRequirement').mockReturnValue(false); // 30분 미달
      vi.spyOn(dateHelper, 'formatMinutes').mockReturnValue('20분');

      // Mock user data - 7일 경과, 20분만 활동
      const mockUsers = [{
        user_id: 'user-123',
        guild_id: testGuildId,
        username: 'TestUser',
        joined_at: '2025-01-01T00:00:00Z',
        last_voice_time: '2025-01-02T00:00:00Z',
        total_minutes: 20, // 30분 미달
        week_start: '2025-01-01T00:00:00Z',
        warning_sent: false,
        status: 'active' as const,
        last_message_time: null,
      }];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);
      vi.mocked(userRepository.updateUser).mockResolvedValue(null);

      await kickChecker.checkAndKickUsers();

      // 강퇴 메서드 호출 확인
      expect(mockGuild.members.fetch).toHaveBeenCalledWith('user-123');
      expect(mockMember.kick).toHaveBeenCalled();
      
      // 상태가 'kicked'로 업데이트 확인
      expect(userRepository.updateUser).toHaveBeenCalledWith(
        'user-123',
        testGuildId,
        { status: 'kicked' }
      );
    });

    it('should NOT kick user when 7 days passed but total minutes >= 30', async () => {
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'hasDaysPassed').mockReturnValue(true);
      vi.spyOn(dateHelper, 'isWarningTimeWithDays').mockReturnValue(false);
      vi.spyOn(dateHelper, 'meetsRequirement').mockReturnValue(true); // 30분 달성

      const mockUsers = [{
        user_id: 'user-456',
        guild_id: testGuildId,
        username: 'GoodUser',
        joined_at: '2025-01-01T00:00:00Z',
        last_voice_time: '2025-01-02T00:00:00Z',
        total_minutes: 35, // 30분 이상
        week_start: '2025-01-01T00:00:00Z',
        warning_sent: false,
        status: 'active' as const,
        last_message_time: null,
      }];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);

      await kickChecker.checkAndKickUsers();

      // 강퇴가 발생하지 않아야 함
      expect(mockMember.kick).not.toHaveBeenCalled();
      expect(userRepository.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('Warning Logic - 6일 경과 + 30분 미달', () => {
    it('should send warning when 6 days passed and total minutes < 30', async () => {
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'hasDaysPassed').mockReturnValue(false); // kick_days 미경과
      vi.spyOn(dateHelper, 'isWarningTimeWithDays').mockReturnValue(true); // warning 시간
      vi.spyOn(dateHelper, 'meetsRequirement').mockReturnValue(false); // 요구사항 미달
      vi.spyOn(dateHelper, 'getDaysUntilDeadlineWithDays').mockReturnValue(1);
      vi.spyOn(dateHelper, 'formatMinutes').mockImplementation((m) => `${m}분`);

      const mockUsers = [{
        user_id: 'user-789',
        guild_id: testGuildId,
        username: 'WarningUser',
        joined_at: '2025-01-01T00:00:00Z',
        last_voice_time: '2025-01-02T00:00:00Z',
        total_minutes: 15, // 30분 미달
        week_start: '2025-01-01T00:00:00Z',
        warning_sent: false, // 경고 미발송
        status: 'active' as const,
        last_message_time: null,
      }];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);
      vi.mocked(userRepository.updateUser).mockResolvedValue(null);

      await kickChecker.checkAndKickUsers();

      // DM 발송 확인
      expect(mockMember.send).toHaveBeenCalled();
      const dmMessage = mockMember.send.mock.calls[0][0];
      expect(dmMessage).toContain('⚠️');
      expect(dmMessage).toContain('경고');
      
      // 경고 상태 업데이트 확인
      expect(userRepository.updateUser).toHaveBeenCalledWith(
        'user-789',
        testGuildId,
        { warning_sent: true, status: 'warned' }
      );
    });

    it('should NOT send warning if already sent', async () => {
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'hasDaysPassed').mockReturnValue(false); // kick_days 미경과
      vi.spyOn(dateHelper, 'isWarningTimeWithDays').mockReturnValue(true); // warning 시간
      vi.spyOn(dateHelper, 'meetsRequirement').mockReturnValue(false); // 요구사항 미달

      const mockUsers = [{
        user_id: 'user-999',
        guild_id: testGuildId,
        username: 'AlreadyWarned',
        joined_at: '2025-01-01T00:00:00Z',
        last_voice_time: '2025-01-02T00:00:00Z',
        total_minutes: 15,
        week_start: '2025-01-01T00:00:00Z',
        warning_sent: true, // 이미 경고 발송됨
        status: 'warned' as const,
        last_message_time: null,
      }];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);

      await kickChecker.checkAndKickUsers();

      // 경고 DM이 다시 발송되지 않아야 함
      expect(mockMember.send).not.toHaveBeenCalled();
    });
  });

  describe('Safe Users - 30분 달성', () => {
    it('should do nothing when user meets requirement', async () => {
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'hasDaysPassed').mockReturnValue(false);
      vi.spyOn(dateHelper, 'isWarningTimeWithDays').mockReturnValue(false);
      vi.spyOn(dateHelper, 'meetsRequirement').mockReturnValue(true); // 30분 달성

      const mockUsers = [{
        user_id: 'user-safe',
        guild_id: testGuildId,
        username: 'SafeUser',
        joined_at: '2025-01-01T00:00:00Z',
        last_voice_time: '2025-01-02T00:00:00Z',
        total_minutes: 40, // 30분 이상
        week_start: '2025-01-01T00:00:00Z',
        warning_sent: false,
        status: 'active' as const,
        last_message_time: null,
      }];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);

      await kickChecker.checkAndKickUsers();

      // 아무 액션도 취해지지 않아야 함
      expect(mockMember.send).not.toHaveBeenCalled();
      expect(mockMember.kick).not.toHaveBeenCalled();
      expect(userRepository.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('Manual Check', () => {
    it('should return summary of manual check results', async () => {
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'hasSevenDaysPassed').mockReturnValue(true);
      vi.spyOn(dateHelper, 'isWarningTime').mockReturnValue(false);
      vi.spyOn(dateHelper, 'meetsWeeklyRequirement').mockReturnValue(false);
      vi.spyOn(dateHelper, 'formatMinutes').mockReturnValue('10분');

      const mockUsers = [
        {
          user_id: 'user-kick',
          guild_id: testGuildId,
          username: 'KickUser',
          joined_at: '2025-01-01T00:00:00Z',
          last_voice_time: '2025-01-02T00:00:00Z',
          total_minutes: 10,
          week_start: '2025-01-01T00:00:00Z',
          warning_sent: false,
          status: 'active' as const,
          last_message_time: null,
        },
      ];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);
      vi.mocked(userRepository.updateUser).mockResolvedValue(null);

      const result = await kickChecker.manualCheck();

      expect(result).toEqual({
        total: 1,
        warned: 0,
        kicked: 1,
      });
    });
  });

  describe('getDetailedUserList', () => {
    it('should include current session minutes in total', async () => {
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'getDaysUntilDeadlineWithDays').mockReturnValue(3);
      vi.spyOn(dateHelper, 'meetsRequirement').mockImplementation((mins) => mins >= 30);

      const mockUsers = [{
        user_id: 'user-online',
        guild_id: testGuildId,
        username: 'OnlineUser',
        joined_at: '2025-01-01T00:00:00Z',
        last_voice_time: '2025-01-08T00:00:00Z',
        total_minutes: 20, // DB에 저장된 시간
        week_start: '2025-01-01T00:00:00Z',
        warning_sent: false,
        status: 'active' as const,
        last_message_time: null,
      }];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);
      
      // 현재 10분 접속 중
      vi.spyOn(mockVoiceTracker, 'getCurrentSessionMinutes').mockReturnValue(10);

      const result = await kickChecker.getDetailedUserList();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        userId: 'user-online',
        username: 'OnlineUser',
        totalMinutes: 20, // DB 시간
        currentSessionMinutes: 10, // 현재 접속 시간
        actualTotalMinutes: 30, // DB + 현재 = 30분 (조건 달성!)
        meetsRequirement: true,
        isCurrentlyInVoice: true,
      });
    });

    it('should sort users by requirement status and minutes', async () => {
      vi.spyOn(dateHelper, 'parseISODate').mockReturnValue(new Date('2025-01-01'));
      vi.spyOn(dateHelper, 'getDaysUntilDeadlineWithDays').mockReturnValue(3);
      vi.spyOn(dateHelper, 'meetsRequirement').mockImplementation((mins) => mins >= 30);

      const mockUsers = [
        {
          user_id: 'user-safe',
          guild_id: testGuildId,
          username: 'SafeUser',
          joined_at: '2025-01-01T00:00:00Z',
          last_voice_time: '2025-01-08T00:00:00Z',
          total_minutes: 40,
          week_start: '2025-01-01T00:00:00Z',
          warning_sent: false,
          status: 'active' as const,
          last_message_time: null,
        },
        {
          user_id: 'user-danger',
          guild_id: testGuildId,
          username: 'DangerUser',
          joined_at: '2025-01-01T00:00:00Z',
          last_voice_time: '2025-01-08T00:00:00Z',
          total_minutes: 10,
          week_start: '2025-01-01T00:00:00Z',
          warning_sent: false,
          status: 'active' as const,
          last_message_time: null,
        },
      ];

      vi.mocked(userRepository.getUsersToCheck).mockResolvedValue(mockUsers);
      vi.spyOn(mockVoiceTracker, 'getCurrentSessionMinutes').mockReturnValue(0);

      const result = await kickChecker.getDetailedUserList();

      // 조건 미달 유저가 먼저 와야 함
      expect(result[0].userId).toBe('user-danger');
      expect(result[0].meetsRequirement).toBe(false);
      expect(result[1].userId).toBe('user-safe');
      expect(result[1].meetsRequirement).toBe(true);
    });
  });
});

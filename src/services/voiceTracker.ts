import { VoiceState } from 'discord.js';
import { userRepository } from '../repositories/userRepository';
import { voiceSessionRepository } from '../repositories/voiceSessionRepository';
import { voiceChannelRepository } from '../repositories/voiceChannelRepository';
import { calculateMinutesBetween, getWeekStart } from '../utils/dateHelper';
import { logger } from '../utils/logger';
import { User } from '../models/types';

// 현재 음성 채널에 있는 유저들의 입장 시간을 추적
const activeVoiceSessions = new Map<string, Date>();

export class VoiceTracker {
  private guildId: string;
  private trackedChannelIds: Set<string> = new Set();

  constructor(guildId: string) {
    this.guildId = guildId;
  }

  /**
   * DB에서 추적할 채널 목록 로드
   */
  async loadTrackedChannels(): Promise<void> {
    const channels = await voiceChannelRepository.getActiveChannels(this.guildId);
    this.trackedChannelIds.clear();
    
    channels.forEach(channel => {
      this.trackedChannelIds.add(channel.channel_id);
    });

    logger.info(`Loaded ${this.trackedChannelIds.size} tracked voice channels`);
  }

  /**
   * 채널이 추적 대상인지 확인
   */
  isTrackedChannel(channelId: string | null): boolean {
    if (!channelId) return false;
    return this.trackedChannelIds.has(channelId);
  }

  /**
   * 추적 채널 목록에 추가
   */
  addTrackedChannel(channelId: string): void {
    this.trackedChannelIds.add(channelId);
  }

  /**
   * 추적 채널 목록에서 제거
   */
  removeTrackedChannel(channelId: string): void {
    this.trackedChannelIds.delete(channelId);
  }

  /**
   * 음성 상태 업데이트 핸들러
   */
  async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const userId = newState.id;
    const guildId = newState.guild.id;
    const username = newState.member?.user.username || 'Unknown';

    const wasInTrackedChannel = this.isTrackedChannel(oldState.channelId);
    const isInTrackedChannel = this.isTrackedChannel(newState.channelId);

    // 추적 채널에 입장
    if (!wasInTrackedChannel && isInTrackedChannel) {
      await this.handleVoiceJoin(userId, guildId, username, newState.channelId!);
    }
    // 추적 채널에서 퇴장
    else if (wasInTrackedChannel && !isInTrackedChannel) {
      await this.handleVoiceLeave(userId, guildId, username, oldState.channelId!);
    }
    // 추적 채널에서 다른 추적 채널로 이동 (퇴장 후 입장으로 처리)
    else if (wasInTrackedChannel && isInTrackedChannel && oldState.channelId !== newState.channelId) {
      await this.handleVoiceLeave(userId, guildId, username, oldState.channelId!);
      await this.handleVoiceJoin(userId, guildId, username, newState.channelId!);
    }
  }

  /**
   * 음성 채널 입장 처리
   */
  private async handleVoiceJoin(userId: string, guildId: string, username: string, channelId: string): Promise<void> {
    const now = new Date();
    activeVoiceSessions.set(userId, now);
    logger.voiceJoin(userId, username, channelId);

    // 유저가 DB에 없으면 생성하지 않음 (서버 가입 시점에 생성됨)
    // 단, last_voice_time 업데이트
    const user = await userRepository.getUserById(userId, guildId);
    if (user) {
      await userRepository.updateUser(userId, guildId, {
        last_voice_time: now.toISOString(),
      });
    }
  }

  /**
   * 음성 채널 퇴장 처리
   */
  private async handleVoiceLeave(userId: string, guildId: string, username: string, channelId: string): Promise<void> {
    const joinTime = activeVoiceSessions.get(userId);
    if (!joinTime) {
      logger.warn(`User ${username} left but no join time recorded`);
      return;
    }

    const now = new Date();
    const durationMinutes = calculateMinutesBetween(joinTime, now);

    // 세션 기록
    await voiceSessionRepository.createSession({
      user_id: userId,
      joined_at: joinTime.toISOString(),
      left_at: now.toISOString(),
      duration_minutes: durationMinutes,
    });

    // 유저의 주간 누적 시간 업데이트
    const user = await userRepository.getUserById(userId, guildId);
    if (user) {
      const newTotalMinutes = user.total_minutes + durationMinutes;
      await userRepository.updateUser(userId, guildId, {
        total_minutes: newTotalMinutes,
        last_voice_time: now.toISOString(),
      });

      logger.voiceLeave(userId, username, channelId, durationMinutes);
      logger.info(`User ${username} total minutes this week: ${newTotalMinutes}`);
    }

    // 활성 세션에서 제거
    activeVoiceSessions.delete(userId);
  }

  /**
   * 새 멤버를 DB에 추가
   */
  async addNewMember(userId: string, guildId: string, username: string, joinedAt: Date): Promise<void> {
    const exists = await userRepository.userExists(userId, guildId);
    if (exists) {
      logger.warn(`User ${username} already exists in database`);
      return;
    }

    const weekStart = getWeekStart(joinedAt);

    const newUser: Omit<User, 'created_at' | 'updated_at'> = {
      user_id: userId,
      guild_id: guildId,
      username: username,
      joined_at: joinedAt.toISOString(),
      last_voice_time: null,
      last_message_time: null,
      total_minutes: 0,
      week_start: weekStart.toISOString(),
      warning_sent: false,
      status: 'active',
    };

    const created = await userRepository.createUser(newUser);
    if (created) {
      logger.newMemberAdded(userId, username);
    } else {
      logger.error(`Failed to add new member ${username} to database`);
    }
  }

  /**
   * 봇 재시작 시 현재 음성 채널에 있는 유저들 초기화
   */
  async initializeActiveUsers(guild: any): Promise<void> {
    await this.loadTrackedChannels();
    
    const now = new Date();
    let count = 0;

    // 모든 채널 순회
    for (const [channelId, channel] of guild.channels.cache) {
      if (this.isTrackedChannel(channelId) && channel.isVoiceBased()) {
        // 해당 채널의 멤버들 순회
        for (const [userId, member] of channel.members) {
          activeVoiceSessions.set(userId, now);
          count++;
        }
      }
    }

    logger.info(`Initialized ${count} active voice sessions across ${this.trackedChannelIds.size} channels`);
  }

  /**
   * 현재 활성 세션 수 조회
   */
  getActiveSessionCount(): number {
    return activeVoiceSessions.size;
  }

  /**
   * 특정 유저의 현재 세션 조회
   */
  getActiveSession(userId: string): Date | undefined {
    return activeVoiceSessions.get(userId);
  }

  /**
   * 특정 유저의 현재 접속 중인 시간(분) 계산
   * 접속 중이 아니면 0 반환
   */
  getCurrentSessionMinutes(userId: string): number {
    const joinTime = activeVoiceSessions.get(userId);
    if (!joinTime) return 0;

    const now = new Date();
    return calculateMinutesBetween(joinTime, now);
  }

  /**
   * 모든 활성 세션 맵 반환 (현재 접속 중인 유저들)
   */
  getAllActiveSessions(): Map<string, Date> {
    return activeVoiceSessions;
  }
}


import { Client, GuildMember } from 'discord.js';
import { userRepository } from '../repositories/userRepository';
import { kickSettingsRepository } from '../repositories/kickSettingsRepository';
import { VoiceTracker } from './voiceTracker';
import {
  hasDaysPassed,
  isWarningTimeWithDays,
  meetsRequirement,
  parseISODate,
  formatMinutes,
  getDaysUntilDeadlineWithDays,
} from '../utils/dateHelper';
import { logger } from '../utils/logger';
import { KickSettings, User } from '../models/types';

export class KickChecker {
  private client: Client;
  private guildId: string;
  private voiceTracker: VoiceTracker;
  private settings: KickSettings | null = null;

  constructor(client: Client, guildId: string, voiceTracker: VoiceTracker) {
    this.client = client;
    this.guildId = guildId;
    this.voiceTracker = voiceTracker;
  }

  /**
   * Load kick settings from database
   */
  private async getSettings(): Promise<KickSettings> {
    if (!this.settings) {
      this.settings = await kickSettingsRepository.getSettings(this.guildId);
    }
    return this.settings;
  }

  /**
   * Refresh settings from database (useful after settings update)
   */
  async refreshSettings(): Promise<void> {
    this.settings = await kickSettingsRepository.getSettings(this.guildId);
    logger.info(`Kick settings refreshed for guild ${this.guildId}`, this.settings);
  }

  private evaluateRequirements(
    user: User,
    settings: KickSettings,
    totalMinutes: number,
    cameraMinutes: number,
    referenceDate: Date
  ) {
    const meetsMinutes = meetsRequirement(totalMinutes, settings.required_minutes);
    const meetsVoice = !settings.require_voice_presence || user.last_voice_time !== null;
    
    // 카메라 체크는 음성 채널 룰이 활성화되어 있을 때만 적용
    let meetsCamera = true;
    if (settings.require_voice_presence) {
      // require_camera_on (레거시): 최소 한 번 카메라를 켰는지 확인
      const meetsCameraUsage = !settings.require_camera_on ||
        (user.last_camera_time ? parseISODate(user.last_camera_time) >= referenceDate : false);
      
      // required_camera_minutes: 카메라 켠 최소 시간 충족 확인
      const meetsCameraTime = meetsRequirement(cameraMinutes, settings.required_camera_minutes);
      
      meetsCamera = meetsCameraUsage && meetsCameraTime;
    }

    return {
      meetsMinutes,
      meetsVoice,
      meetsCamera,
      meetsCameraTime: settings.require_voice_presence ? 
        meetsRequirement(cameraMinutes, settings.required_camera_minutes) : true,
      meetsAll: meetsMinutes && meetsVoice && meetsCamera,
    };
  }

  /**
   * 주기적으로 실행되는 체크 로직
   */
  async checkAndKickUsers(): Promise<void> {
    logger.checkStarted();

    const settings = await this.getSettings();
    const users = await userRepository.getUsersToCheck(this.guildId);
    let usersWarned = 0;
    let usersKicked = 0;

    for (const user of users) {
      try {
        // 기준 시간: 마지막 음성 접속 시간 또는 서버 가입 시간
        const referenceDate = user.last_voice_time
          ? parseISODate(user.last_voice_time)
          : parseISODate(user.joined_at);

        const currentSessionMinutes = this.voiceTracker.getCurrentSessionMinutes(user.user_id);
        const actualTotalMinutes = user.total_minutes + currentSessionMinutes;
        
        // 현재 세션에서 카메라 켠 시간 계산
        const currentCameraMinutes = this.voiceTracker.getCurrentCameraMinutes(user.user_id);
        const actualCameraMinutes = user.camera_on_minutes + currentCameraMinutes;
        
        const requirementStatus = this.evaluateRequirements(
          user as User,
          settings,
          actualTotalMinutes,
          actualCameraMinutes,
          referenceDate
        );

        const kickDaysPassed = hasDaysPassed(referenceDate, settings.kick_days);
        const isWarning = isWarningTimeWithDays(
          referenceDate,
          settings.warning_days,
          settings.kick_days
        );

        // kick_days 경과 + required_minutes 미달 = 강퇴
        if (kickDaysPassed && !requirementStatus.meetsAll) {
          const kicked = await this.kickUser(
            user.user_id,
            user.username,
            actualTotalMinutes,
            actualCameraMinutes,
            settings,
            requirementStatus
          );
          if (kicked) {
            usersKicked++;
            // 상태를 kicked로 변경
            await userRepository.updateUser(user.user_id, this.guildId, {
              status: 'kicked',
            });
          }
        }
        // warning_days 경과 + required_minutes 미달 + 경고 미발송 = 경고
        else if (isWarning && !requirementStatus.meetsAll && !user.warning_sent) {
          const warned = await this.sendWarning(
            user.user_id,
            user.username,
            actualTotalMinutes,
            actualCameraMinutes,
            referenceDate,
            settings,
            requirementStatus
          );
          if (warned) {
            usersWarned++;
            // 경고 발송 표시 및 상태 변경
            await userRepository.updateUser(user.user_id, this.guildId, {
              warning_sent: true,
              status: 'warned',
            });
          }
        }
      } catch (error) {
        logger.error(`Error checking user ${user.username}`, error);
      }
    }

    logger.checkCompleted(users.length, usersWarned, usersKicked);
  }

  /**
   * 유저에게 경고 DM 발송
   */
  private async sendWarning(
    userId: string,
    username: string,
    totalMinutes: number,
    cameraMinutes: number,
    referenceDate: Date,
    settings: KickSettings,
    requirements: { meetsMinutes: boolean; meetsVoice: boolean; meetsCamera: boolean; meetsCameraTime: boolean }
  ): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const member = await guild.members.fetch(userId);

      if (!member) {
        logger.warn(`Member ${username} not found in guild`);
        return false;
      }

      const daysRemaining = getDaysUntilDeadlineWithDays(referenceDate, settings.kick_days);
      const minutesNeeded = Math.max(0, settings.required_minutes - totalMinutes);

      const details: string[] = [];

      if (!requirements.meetsMinutes) {
        details.push(
          `- 현재 활동 시간: ${formatMinutes(totalMinutes)}`,
          `- 필요 시간: ${settings.required_minutes}분`,
          `- 부족한 시간: ${formatMinutes(minutesNeeded)}`
        );
      }

      if (settings.require_voice_presence && !requirements.meetsVoice) {
        details.push('- 음성 채널 참여 이력이 필요합니다.');
      }

      if (settings.require_camera_on && !requirements.meetsCamera) {
        details.push('- 추적된 음성 채널에서 카메라 사용 기록이 필요합니다.');
      }

      if (settings.required_camera_minutes > 0 && !requirements.meetsCameraTime) {
        const cameraNeeded = Math.max(0, settings.required_camera_minutes - cameraMinutes);
        details.push(
          `- 현재 카메라 켠 시간: ${formatMinutes(cameraMinutes)}`,
          `- 필요 시간: ${settings.required_camera_minutes}분`,
          `- 부족한 시간: ${formatMinutes(cameraNeeded)}`
        );
      }

      const detailsText = details.length > 0
        ? details.join('\n')
        : '- 설정된 조건을 충족하지 못했습니다.';

      const warningMessage = `
⚠️ **스터디 활동 경고**

안녕하세요, ${username}님!

현재 설정된 조건을 충족하지 못했습니다:
${detailsText}
- 남은 기간: 약 ${daysRemaining}일

**${daysRemaining}일 이내에 ${formatMinutes(minutesNeeded)}을 채우지 못하면 자동으로 서버에서 퇴장 처리됩니다.**

지정된 음성 채널에 접속하여 활동 시간을 채워주세요! 🎯
      `.trim();

      await member.send(warningMessage);
      logger.warningSent(userId, username, daysRemaining, totalMinutes);
      return true;
    } catch (error: any) {
      logger.warningFailed(userId, username, error.message);
      return false;
    }
  }

  /**
   * 유저 강퇴
   */
  private async kickUser(
    userId: string,
    username: string,
    totalMinutes: number,
    cameraMinutes: number,
    settings: KickSettings,
    requirements: { meetsMinutes: boolean; meetsVoice: boolean; meetsCamera: boolean; meetsCameraTime: boolean }
  ): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const member = await guild.members.fetch(userId);

      if (!member) {
        logger.warn(`Member ${username} not found in guild`);
        return false;
      }

      const reasons: string[] = [];
      if (!requirements.meetsMinutes) {
        reasons.push(`주간 활동 시간 미달 (${formatMinutes(totalMinutes)} / ${settings.required_minutes}분)`);
      }
      if (settings.require_voice_presence && !requirements.meetsVoice) {
        reasons.push('음성 채널 참여 이력 부족');
      }
      if (settings.require_camera_on && !requirements.meetsCamera) {
        reasons.push('카메라 사용 이력 부족');
      }
      if (settings.required_camera_minutes > 0 && !requirements.meetsCameraTime) {
        reasons.push(`카메라 켠 시간 미달 (${formatMinutes(cameraMinutes)} / ${settings.required_camera_minutes}분)`);
      }
      const kickReason = reasons.join(' | ') || '설정된 조건 미충족';

      // 강퇴 전 DM 발송 시도
      try {
        const kickDetails: string[] = [];
        if (!requirements.meetsMinutes) {
          kickDetails.push(
            `- 최종 활동 시간: ${formatMinutes(totalMinutes)}`,
            `- 필요 시간: ${settings.required_minutes}분`
          );
        }
        if (settings.require_voice_presence && !requirements.meetsVoice) {
          kickDetails.push('- 음성 채널 참여 이력이 부족했습니다.');
        }
        if (settings.require_camera_on && !requirements.meetsCamera) {
          kickDetails.push('- 카메라 사용 기록이 확인되지 않았습니다.');
        }
        if (settings.required_camera_minutes > 0 && !requirements.meetsCameraTime) {
          kickDetails.push(
            `- 최종 카메라 켠 시간: ${formatMinutes(cameraMinutes)}`,
            `- 필요 시간: ${settings.required_camera_minutes}분`
          );
        }

        const detailText = kickDetails.length > 0
          ? kickDetails.join('\n')
          : '- 설정된 조건을 충족하지 못했습니다.';

        const kickMessage = `
🚫 **서버 퇴장 안내**

${username}님, 안녕하세요.

${detailText}

다시 참여를 원하시면 관리자에게 문의해 주세요.
        `.trim();

        await member.send(kickMessage);
      } catch (dmError) {
        logger.warn(`Could not send DM to ${username} before kick`);
      }

      // 강퇴 실행
      await member.kick(kickReason);
      logger.userKicked(userId, username, totalMinutes);
      return true;
    } catch (error: any) {
      logger.kickFailed(userId, username, error.message);
      return false;
    }
  }

  /**
   * 수동 체크 (관리자 명령어용)
   */
  async manualCheck(): Promise<{ warned: number; kicked: number; total: number }> {
    logger.info('Manual check initiated');
    
    const settings = await this.getSettings();
    const users = await userRepository.getUsersToCheck(this.guildId);
    let usersWarned = 0;
    let usersKicked = 0;

    for (const user of users) {
      const referenceDate = user.last_voice_time
        ? parseISODate(user.last_voice_time)
        : parseISODate(user.joined_at);

      const kickDaysPassed = hasDaysPassed(referenceDate, settings.kick_days);
      const isWarning = isWarningTimeWithDays(
        referenceDate,
        settings.warning_days,
        settings.kick_days
      );

      const currentSessionMinutes = this.voiceTracker.getCurrentSessionMinutes(user.user_id);
      const actualTotalMinutes = user.total_minutes + currentSessionMinutes;
      
      const currentCameraMinutes = this.voiceTracker.getCurrentCameraMinutes(user.user_id);
      const actualCameraMinutes = user.camera_on_minutes + currentCameraMinutes;
      
      const requirements = this.evaluateRequirements(
        user as User,
        settings,
        actualTotalMinutes,
        actualCameraMinutes,
        referenceDate
      );

      if (kickDaysPassed && !requirements.meetsAll) {
        const kicked = await this.kickUser(
          user.user_id,
          user.username,
          actualTotalMinutes,
          actualCameraMinutes,
          settings,
          requirements
        );
        if (kicked) {
          usersKicked++;
          await userRepository.updateUser(user.user_id, this.guildId, {
            status: 'kicked',
          });
        }
      } else if (isWarning && !requirements.meetsAll && !user.warning_sent) {
        const warned = await this.sendWarning(
          user.user_id,
          user.username,
          actualTotalMinutes,
          actualCameraMinutes,
          referenceDate,
          settings,
          requirements
        );
        if (warned) {
          usersWarned++;
          await userRepository.updateUser(user.user_id, this.guildId, {
            warning_sent: true,
            status: 'warned',
          });
        }
      }
    }

    return {
      total: users.length,
      warned: usersWarned,
      kicked: usersKicked,
    };
  }

  /**
   * 모든 유저의 상세 정보 조회 (pagination용)
   */
  async getDetailedUserList(): Promise<Array<{
    userId: string;
    username: string;
    totalMinutes: number;
    currentSessionMinutes: number;
    actualTotalMinutes: number; // DB 시간 + 현재 접속 시간
    status: string;
    daysUntilDeadline: number;
    meetsRequirement: boolean;
    meetsCameraRequirement: boolean;
    meetsVoiceRequirement: boolean;
    referenceDate: Date;
    lastVoiceTime: string | null;
    lastMessageTime: string | null;
    isCurrentlyInVoice: boolean;
  }>> {
    const settings = await this.getSettings();
    const users = await userRepository.getUsersToCheck(this.guildId);
    
    return users.map(user => {
      const referenceDate = user.last_voice_time
        ? parseISODate(user.last_voice_time)
        : parseISODate(user.joined_at);

      // 현재 접속 중인 시간 계산
      const currentSessionMinutes = this.voiceTracker.getCurrentSessionMinutes(user.user_id);
      const actualTotalMinutes = user.total_minutes + currentSessionMinutes;

      const currentCameraMinutes = this.voiceTracker.getCurrentCameraMinutes(user.user_id);
      const actualCameraMinutes = user.camera_on_minutes + currentCameraMinutes;

      const daysUntilDeadline = getDaysUntilDeadlineWithDays(referenceDate, settings.kick_days);
      const requirementStatus = this.evaluateRequirements(
        user as User,
        settings,
        actualTotalMinutes,
        actualCameraMinutes,
        referenceDate
      );

      return {
        userId: user.user_id,
        username: user.username,
        totalMinutes: user.total_minutes,
        cameraOnMinutes: user.camera_on_minutes,
        currentSessionMinutes,
        currentCameraMinutes,
        actualTotalMinutes,
        actualCameraMinutes,
        status: user.status,
        daysUntilDeadline,
        meetsRequirement: requirementStatus.meetsAll,
        meetsCameraRequirement: requirementStatus.meetsCamera,
        meetsCameraTimeRequirement: requirementStatus.meetsCameraTime,
        meetsVoiceRequirement: requirementStatus.meetsVoice,
        referenceDate,
        lastVoiceTime: user.last_voice_time,
        lastMessageTime: user.last_message_time,
        isCurrentlyInVoice: currentSessionMinutes > 0,
      };
    }).sort((a, b) => {
      // 정렬: 조건 미달 > 경고 > 정상
      if (a.meetsRequirement !== b.meetsRequirement) {
        return a.meetsRequirement ? 1 : -1;
      }
      return a.actualTotalMinutes - b.actualTotalMinutes;
    });
  }
}


import { Client, GuildMember } from 'discord.js';
import { userRepository } from '../repositories/userRepository';
import {
  hasSevenDaysPassed,
  isWarningTime,
  meetsWeeklyRequirement,
  parseISODate,
  formatMinutes,
  getDaysUntilDeadline,
} from '../utils/dateHelper';
import { logger } from '../utils/logger';

export class KickChecker {
  private client: Client;
  private guildId: string;

  constructor(client: Client, guildId: string) {
    this.client = client;
    this.guildId = guildId;
  }

  /**
   * 주기적으로 실행되는 체크 로직
   */
  async checkAndKickUsers(): Promise<void> {
    logger.checkStarted();

    const users = await userRepository.getUsersToCheck(this.guildId);
    let usersWarned = 0;
    let usersKicked = 0;

    for (const user of users) {
      try {
        // 기준 시간: 마지막 음성 접속 시간 또는 서버 가입 시간
        const referenceDate = user.last_voice_time
          ? parseISODate(user.last_voice_time)
          : parseISODate(user.joined_at);

        const sevenDaysPassed = hasSevenDaysPassed(referenceDate);
        const isWarning = isWarningTime(referenceDate);
        const meetsRequirement = meetsWeeklyRequirement(user.total_minutes);

        // 7일 경과 + 30분 미달 = 강퇴
        if (sevenDaysPassed && !meetsRequirement) {
          const kicked = await this.kickUser(user.user_id, user.username, user.total_minutes);
          if (kicked) {
            usersKicked++;
            // 상태를 kicked로 변경
            await userRepository.updateUser(user.user_id, this.guildId, {
              status: 'kicked',
            });
          }
        }
        // 6일 경과 (24시간 전) + 30분 미달 + 경고 미발송 = 경고
        else if (isWarning && !meetsRequirement && !user.warning_sent) {
          const warned = await this.sendWarning(
            user.user_id,
            user.username,
            user.total_minutes,
            referenceDate
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
    referenceDate: Date
  ): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const member = await guild.members.fetch(userId);

      if (!member) {
        logger.warn(`Member ${username} not found in guild`);
        return false;
      }

      const daysRemaining = getDaysUntilDeadline(referenceDate);
      const minutesNeeded = 30 - totalMinutes;

      const warningMessage = `
⚠️ **스터디 활동 경고**

안녕하세요, ${username}님!

현재 주간 음성 채널 활동 시간이 부족합니다:
- 현재 활동 시간: ${formatMinutes(totalMinutes)}
- 필요 시간: 30분
- 부족한 시간: ${formatMinutes(minutesNeeded)}
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
  private async kickUser(userId: string, username: string, totalMinutes: number): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const member = await guild.members.fetch(userId);

      if (!member) {
        logger.warn(`Member ${username} not found in guild`);
        return false;
      }

      const kickReason = `주간 활동 시간 미달 (${formatMinutes(totalMinutes)} / 30분)`;

      // 강퇴 전 DM 발송 시도
      try {
        const kickMessage = `
🚫 **서버 퇴장 안내**

${username}님, 안녕하세요.

주간 음성 채널 활동 시간(30분) 미달로 인해 서버에서 자동 퇴장 처리되었습니다.

- 최종 활동 시간: ${formatMinutes(totalMinutes)}
- 필요 시간: 30분

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
    
    const users = await userRepository.getUsersToCheck(this.guildId);
    let usersWarned = 0;
    let usersKicked = 0;

    for (const user of users) {
      const referenceDate = user.last_voice_time
        ? parseISODate(user.last_voice_time)
        : parseISODate(user.joined_at);

      const sevenDaysPassed = hasSevenDaysPassed(referenceDate);
      const isWarning = isWarningTime(referenceDate);
      const meetsRequirement = meetsWeeklyRequirement(user.total_minutes);

      if (sevenDaysPassed && !meetsRequirement) {
        const kicked = await this.kickUser(user.user_id, user.username, user.total_minutes);
        if (kicked) {
          usersKicked++;
          await userRepository.updateUser(user.user_id, this.guildId, {
            status: 'kicked',
          });
        }
      } else if (isWarning && !meetsRequirement && !user.warning_sent) {
        const warned = await this.sendWarning(
          user.user_id,
          user.username,
          user.total_minutes,
          referenceDate
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
}


import { userRepository } from '../repositories/userRepository';
import { voiceSessionRepository } from '../repositories/voiceSessionRepository';
import { WeeklyReport } from '../models/types';
import { getDaysUntilDeadline, parseISODate, formatMinutes } from '../utils/dateHelper';

export class StatsService {
  /**
   * 전체 통계 조회 (대시보드용)
   */
  async getOverallStats(guildId: string) {
    const stats = await userRepository.getStats(guildId);
    return stats;
  }

  /**
   * 주간 리포트 생성
   */
  async generateWeeklyReport(guildId: string): Promise<WeeklyReport[]> {
    const users = await userRepository.getActiveUsers(guildId);
    const reports: WeeklyReport[] = [];

    for (const user of users) {
      const referenceDate = user.last_voice_time
        ? parseISODate(user.last_voice_time)
        : parseISODate(user.joined_at);

      const daysUntilDeadline = getDaysUntilDeadline(referenceDate);

      // 주간 세션 조회
      const sessions = await voiceSessionRepository.getWeeklySessions(
        user.user_id,
        user.week_start
      );

      reports.push({
        user_id: user.user_id,
        username: user.username,
        total_minutes: user.total_minutes,
        session_count: sessions.length,
        status: user.status,
        days_until_deadline: daysUntilDeadline,
      });
    }

    // 남은 시간이 적은 순으로 정렬
    reports.sort((a, b) => a.days_until_deadline - b.days_until_deadline);

    return reports;
  }

  /**
   * 특정 유저의 상세 통계
   */
  async getUserDetailedStats(userId: string, guildId: string) {
    const user = await userRepository.getUserById(userId, guildId);
    if (!user) {
      return null;
    }

    const sessions = await voiceSessionRepository.getWeeklySessions(
      userId,
      user.week_start
    );

    const referenceDate = user.last_voice_time
      ? parseISODate(user.last_voice_time)
      : parseISODate(user.joined_at);

    return {
      user,
      sessions,
      daysUntilDeadline: getDaysUntilDeadline(referenceDate),
      totalMinutesFormatted: formatMinutes(user.total_minutes),
      meetsRequirement: user.total_minutes >= 30,
    };
  }

  /**
   * 위험 유저 목록 (경고 필요 또는 강퇴 대상)
   */
  async getRiskyUsers(guildId: string) {
    const users = await userRepository.getUsersToCheck(guildId);
    const riskyUsers = [];

    for (const user of users) {
      const referenceDate = user.last_voice_time
        ? parseISODate(user.last_voice_time)
        : parseISODate(user.joined_at);

      const daysUntilDeadline = getDaysUntilDeadline(referenceDate);

      // 2일 이하 남았고 30분 미달
      if (daysUntilDeadline <= 2 && user.total_minutes < 30) {
        riskyUsers.push({
          ...user,
          daysUntilDeadline,
          minutesNeeded: 30 - user.total_minutes,
        });
      }
    }

    return riskyUsers;
  }

  /**
   * 기간별 세션 통계
   */
  async getSessionStatsByDateRange(startDate: string, endDate: string) {
    return await voiceSessionRepository.getAllSessionStats(startDate, endDate);
  }
}

export const statsService = new StatsService();


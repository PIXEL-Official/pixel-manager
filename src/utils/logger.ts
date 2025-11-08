/**
 * 로깅 유틸리티
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      logMessage += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return logMessage;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, data));
  }

  success(message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.SUCCESS, message, data));
  }

  // 음성 채널 관련 로그
  voiceJoin(userId: string, username: string, channelId: string): void {
    this.info(`User joined voice channel`, {
      userId,
      username,
      channelId,
    });
  }

  voiceLeave(userId: string, username: string, channelId: string, durationMinutes: number): void {
    this.info(`User left voice channel`, {
      userId,
      username,
      channelId,
      durationMinutes,
    });
  }

  // 경고 발송 로그
  warningSent(userId: string, username: string, daysRemaining: number, minutesLogged: number): void {
    this.warn(`Warning sent to user`, {
      userId,
      username,
      daysRemaining,
      minutesLogged,
    });
  }

  warningFailed(userId: string, username: string, reason: string): void {
    this.error(`Failed to send warning`, {
      userId,
      username,
      reason,
    });
  }

  // 강퇴 로그
  userKicked(userId: string, username: string, totalMinutes: number): void {
    this.warn(`User kicked for insufficient activity`, {
      userId,
      username,
      totalMinutes,
      reason: 'Less than 30 minutes in 7 days',
    });
  }

  kickFailed(userId: string, username: string, reason: string): void {
    this.error(`Failed to kick user`, {
      userId,
      username,
      reason,
    });
  }

  // 주기적 체크 로그
  checkStarted(): void {
    this.info('Starting periodic user check');
  }

  checkCompleted(usersChecked: number, usersWarned: number, usersKicked: number): void {
    this.success('Periodic check completed', {
      usersChecked,
      usersWarned,
      usersKicked,
    });
  }

  // 새 멤버 추가 로그
  newMemberAdded(userId: string, username: string): void {
    this.info('New member added to tracking', {
      userId,
      username,
    });
  }

  // 데이터베이스 오류 로그
  dbError(operation: string, error: any): void {
    this.error(`Database error during ${operation}`, {
      error: error.message || error,
    });
  }
}

export const logger = new Logger();


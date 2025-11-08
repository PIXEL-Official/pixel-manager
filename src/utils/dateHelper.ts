/**
 * 현재 주차의 시작 시간 계산 (가입일 또는 마지막 음성 접속일 기준)
 */
export function getWeekStart(referenceDate: Date): Date {
  return new Date(referenceDate);
}

/**
 * 7일 경과 여부 체크
 */
export function hasSevenDaysPassed(startDate: Date, now: Date = new Date()): boolean {
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 7;
}

/**
 * 24시간 전 (6일 경과) 체크 - 경고 발송 타이밍
 */
export function isWarningTime(startDate: Date, now: Date = new Date()): boolean {
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  // 6일 이상 7일 미만
  return diffDays >= 6 && diffDays < 7;
}

/**
 * 남은 일수 계산
 */
export function getDaysUntilDeadline(startDate: Date, now: Date = new Date()): number {
  const sevenDaysLater = new Date(startDate);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  
  const diffMs = sevenDaysLater.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * 주간 시간 충족 여부 (30분 이상)
 */
export function meetsWeeklyRequirement(totalMinutes: number): boolean {
  return totalMinutes >= 30;
}

/**
 * 분을 시간:분 형식으로 변환
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}시간 ${mins}분`;
  }
  return `${mins}분`;
}

/**
 * ISO 문자열을 Date 객체로 안전하게 변환
 */
export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * 두 시간 사이의 분 계산
 */
export function calculateMinutesBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60));
}


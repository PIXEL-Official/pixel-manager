/**
 * 현재 주차의 시작 시간 계산 (가입일 또는 마지막 음성 접속일 기준)
 */
export function getWeekStart(referenceDate: Date): Date {
  return new Date(referenceDate);
}

/**
 * 7일 경과 여부 체크
 * @deprecated Use hasDaysPassed with custom days parameter instead
 */
export function hasSevenDaysPassed(startDate: Date, now: Date = new Date()): boolean {
  return hasDaysPassed(startDate, 7, now);
}

/**
 * 지정된 일수 경과 여부 체크
 */
export function hasDaysPassed(startDate: Date, days: number, now: Date = new Date()): boolean {
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= days;
}

/**
 * 24시간 전 (6일 경과) 체크 - 경고 발송 타이밍
 * @deprecated Use isWarningTimeWithDays with custom days parameters instead
 */
export function isWarningTime(startDate: Date, now: Date = new Date()): boolean {
  return isWarningTimeWithDays(startDate, 6, 7, now);
}

/**
 * 경고 발송 타이밍 체크 (warningDays 이상, kickDays 미만)
 */
export function isWarningTimeWithDays(
  startDate: Date,
  warningDays: number,
  kickDays: number,
  now: Date = new Date()
): boolean {
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  return diffDays >= warningDays && diffDays < kickDays;
}

/**
 * 남은 일수 계산
 * @deprecated Use getDaysUntilDeadlineWithDays with custom days parameter instead
 */
export function getDaysUntilDeadline(startDate: Date, now: Date = new Date()): number {
  return getDaysUntilDeadlineWithDays(startDate, 7, now);
}

/**
 * 남은 일수 계산 (설정된 일수 기준)
 */
export function getDaysUntilDeadlineWithDays(
  startDate: Date,
  kickDays: number,
  now: Date = new Date()
): number {
  const deadlineDate = new Date(startDate);
  deadlineDate.setDate(deadlineDate.getDate() + kickDays);
  
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * 주간 시간 충족 여부 (30분 이상)
 * @deprecated Use meetsRequirement with custom minutes parameter instead
 */
export function meetsWeeklyRequirement(totalMinutes: number): boolean {
  return meetsRequirement(totalMinutes, 30);
}

/**
 * 필요 시간 충족 여부 체크
 */
export function meetsRequirement(totalMinutes: number, requiredMinutes: number): boolean {
  return totalMinutes >= requiredMinutes;
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


import { supabase } from '../database/supabase';
import { VoiceSession } from '../models/types';

export class VoiceSessionRepository {
  /**
   * 새로운 세션 기록
   */
  async createSession(session: Omit<VoiceSession, 'id' | 'created_at'>): Promise<VoiceSession | null> {
    const { data, error } = await supabase
      .from('voice_sessions')
      .insert([session])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return data;
  }

  /**
   * 특정 유저의 세션 조회
   */
  async getUserSessions(userId: string, limit?: number): Promise<VoiceSession[]> {
    let query = supabase
      .from('voice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 특정 기간의 세션 조회
   */
  async getSessionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<VoiceSession[]> {
    const { data, error } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('joined_at', startDate)
      .lte('joined_at', endDate)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions by date range:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 유저의 주간 세션 조회
   */
  async getWeeklySessions(userId: string, weekStart: string): Promise<VoiceSession[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.getSessionsByDateRange(userId, weekStart, weekEnd.toISOString());
  }

  /**
   * 유저의 총 세션 시간 계산 (특정 기간)
   */
  async getTotalMinutes(userId: string, startDate: string, endDate: string): Promise<number> {
    const sessions = await this.getSessionsByDateRange(userId, startDate, endDate);
    return sessions.reduce((total, session) => total + session.duration_minutes, 0);
  }

  /**
   * 모든 유저의 세션 통계 (대시보드용)
   */
  async getAllSessionStats(startDate: string, endDate: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('voice_sessions')
      .select('user_id, duration_minutes')
      .gte('joined_at', startDate)
      .lte('joined_at', endDate);

    if (error) {
      console.error('Error fetching all session stats:', error);
      return [];
    }

    // 유저별로 그룹화하여 통계 계산
    const statsMap = new Map<string, { userId: string; totalMinutes: number; sessionCount: number }>();

    data?.forEach((session) => {
      const existing = statsMap.get(session.user_id);
      if (existing) {
        existing.totalMinutes += session.duration_minutes;
        existing.sessionCount += 1;
      } else {
        statsMap.set(session.user_id, {
          userId: session.user_id,
          totalMinutes: session.duration_minutes,
          sessionCount: 1,
        });
      }
    });

    return Array.from(statsMap.values());
  }

  /**
   * 세션 삭제 (오래된 데이터 정리용)
   */
  async deleteOldSessions(beforeDate: string): Promise<number> {
    const { error, count } = await supabase
      .from('voice_sessions')
      .delete()
      .lt('created_at', beforeDate);

    if (error) {
      console.error('Error deleting old sessions:', error);
      return 0;
    }

    return count || 0;
  }
}

export const voiceSessionRepository = new VoiceSessionRepository();


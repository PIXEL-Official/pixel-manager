import { supabase } from '../database/supabase';
import { User, UserStats } from '../models/types';

export class UserRepository {
  /**
   * 새로운 유저 생성
   */
  async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  }

  /**
   * 유저 ID로 조회
   */
  async getUserById(userId: string, guildId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  }

  /**
   * 유저 정보 업데이트
   */
  async updateUser(userId: string, guildId: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return data;
  }

  /**
   * 유저 삭제
   */
  async deleteUser(userId: string, guildId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId)
      .eq('guild_id', guildId);

    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }

    return true;
  }

  /**
   * 모든 활성 유저 조회
   */
  async getActiveUsers(guildId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('guild_id', guildId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching active users:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 경고 받은 유저 조회
   */
  async getWarnedUsers(guildId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('guild_id', guildId)
      .eq('status', 'warned');

    if (error) {
      console.error('Error fetching warned users:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 조건 미달 유저 검색 (7일 경과 + 30분 미만)
   */
  async getUsersToCheck(guildId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('guild_id', guildId)
      .in('status', ['active', 'warned']);

    if (error) {
      console.error('Error fetching users to check:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 통계 조회
   */
  async getStats(guildId: string): Promise<UserStats> {
    const { data, error } = await supabase
      .from('users')
      .select('status')
      .eq('guild_id', guildId);

    if (error) {
      console.error('Error fetching stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        warnedUsers: 0,
        kickedUsers: 0,
      };
    }

    const stats: UserStats = {
      totalUsers: data.length,
      activeUsers: data.filter(u => u.status === 'active').length,
      warnedUsers: data.filter(u => u.status === 'warned').length,
      kickedUsers: data.filter(u => u.status === 'kicked').length,
    };

    return stats;
  }

  /**
   * 주차 리셋 (매주 일요일 등)
   */
  async resetWeeklyMinutes(guildId: string): Promise<number> {
    const newWeekStart = new Date().toISOString();
    
    const { error, count } = await supabase
      .from('users')
      .update({
        total_minutes: 0,
        week_start: newWeekStart,
        warning_sent: false,
        updated_at: new Date().toISOString(),
      })
      .eq('guild_id', guildId)
      .in('status', ['active', 'warned']);

    if (error) {
      console.error('Error resetting weekly minutes:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * 유저 존재 여부 확인 (upsert 전 체크용)
   */
  async userExists(userId: string, guildId: string): Promise<boolean> {
    const user = await this.getUserById(userId, guildId);
    return user !== null;
  }

  /**
   * 마지막 메시지 시간 업데이트
   */
  async updateLastMessageTime(userId: string, guildId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ 
        last_message_time: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('guild_id', guildId);

    if (error) {
      console.error('Error updating last message time:', error);
      return false;
    }

    return true;
  }
}

export const userRepository = new UserRepository();


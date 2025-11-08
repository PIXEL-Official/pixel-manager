import { supabase } from '../database/supabase';
import { ChatChannel } from '../models/types';

export class ChatChannelRepository {
  /**
   * 새로운 채팅 채널 추가
   */
  async addChannel(channel: Omit<ChatChannel, 'id' | 'created_at' | 'updated_at'>): Promise<ChatChannel | null> {
    // 중복 체크
    const existing = await this.getChannelById(channel.channel_id, channel.guild_id);
    if (existing) {
      console.log('Chat channel already exists');
      return null;
    }

    const { data, error } = await supabase
      .from('chat_channels')
      .insert([channel])
      .select()
      .single();

    if (error) {
      console.error('Error adding chat channel:', error);
      return null;
    }

    return data;
  }

  /**
   * 채널 ID로 조회
   */
  async getChannelById(channelId: string, guildId: string): Promise<ChatChannel | null> {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('channel_id', channelId)
      .eq('guild_id', guildId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching chat channel:', error);
      return null;
    }

    return data;
  }

  /**
   * 길드의 모든 활성 채널 조회
   */
  async getActiveChannels(guildId: string): Promise<ChatChannel[]> {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('guild_id', guildId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching active chat channels:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 길드의 모든 채널 조회 (비활성 포함)
   */
  async getAllChannels(guildId: string): Promise<ChatChannel[]> {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all chat channels:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 채널 제거 (소프트 삭제 - is_active를 false로)
   */
  async removeChannel(channelId: string, guildId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_channels')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('guild_id', guildId);

    if (error) {
      console.error('Error removing chat channel:', error);
      return false;
    }

    return true;
  }

  /**
   * 채널 완전 삭제 (하드 삭제)
   */
  async deleteChannel(channelId: string, guildId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_channels')
      .delete()
      .eq('channel_id', channelId)
      .eq('guild_id', guildId);

    if (error) {
      console.error('Error deleting chat channel:', error);
      return false;
    }

    return true;
  }

  /**
   * 채널 재활성화
   */
  async reactivateChannel(channelId: string, guildId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_channels')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('guild_id', guildId);

    if (error) {
      console.error('Error reactivating chat channel:', error);
      return false;
    }

    return true;
  }

  /**
   * 채널 이름 업데이트
   */
  async updateChannelName(channelId: string, guildId: string, channelName: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_channels')
      .update({ channel_name: channelName, updated_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('guild_id', guildId);

    if (error) {
      console.error('Error updating chat channel name:', error);
      return false;
    }

    return true;
  }

  /**
   * 채널 ID가 추적 대상인지 확인
   */
  async isTrackedChannel(channelId: string, guildId: string): Promise<boolean> {
    const channel = await this.getChannelById(channelId, guildId);
    return channel !== null && channel.is_active;
  }
}

export const chatChannelRepository = new ChatChannelRepository();


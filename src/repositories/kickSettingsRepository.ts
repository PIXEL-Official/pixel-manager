import { supabase } from '../database/supabase';
import { KickSettings } from '../models/types';
import { logger } from '../utils/logger';

class KickSettingsRepository {
  private tableName = 'kick_settings';

  /**
   * Get kick settings for a guild, or return default values if not found
   */
  async getSettings(guildId: string): Promise<KickSettings> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('guild_id', guildId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return defaults
          logger.info(`No kick settings found for guild ${guildId}, using defaults`);
          return this.getDefaultSettings(guildId);
        }
        throw error;
      }

      return {
        ...data,
        require_camera_on: data.require_camera_on ?? false,
        require_voice_presence: data.require_voice_presence ?? false,
      } as KickSettings;
    } catch (error) {
      logger.error(`Error fetching kick settings for guild ${guildId}`, error);
      return this.getDefaultSettings(guildId);
    }
  }

  /**
   * Create or update kick settings for a guild
   */
  async upsertSettings(settings: KickSettings): Promise<KickSettings | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .upsert({
          guild_id: settings.guild_id,
          kick_days: settings.kick_days,
          warning_days: settings.warning_days,
          required_minutes: settings.required_minutes,
          require_camera_on: settings.require_camera_on,
          require_voice_presence: settings.require_voice_presence,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Kick settings updated for guild ${settings.guild_id}`);
      return data;
    } catch (error) {
      logger.error(`Error upserting kick settings for guild ${settings.guild_id}`, error);
      return null;
    }
  }

  /**
   * Update specific fields of kick settings
   */
  async updateSettings(
    guildId: string,
    updates: Partial<Omit<KickSettings, 'guild_id' | 'created_at' | 'updated_at'>>
  ): Promise<KickSettings | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('guild_id', guildId)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Kick settings updated for guild ${guildId}`, updates);
      return data;
    } catch (error) {
      logger.error(`Error updating kick settings for guild ${guildId}`, error);
      return null;
    }
  }

  /**
   * Delete kick settings for a guild (will revert to defaults)
   */
  async deleteSettings(guildId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('guild_id', guildId);

      if (error) throw error;

      logger.info(`Kick settings deleted for guild ${guildId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting kick settings for guild ${guildId}`, error);
      return false;
    }
  }

  /**
   * Get default kick settings
   */
  private getDefaultSettings(guildId: string): KickSettings {
    return {
      guild_id: guildId,
      kick_days: 7,
      warning_days: 6,
      required_minutes: 30,
      require_camera_on: false,
      require_voice_presence: false,
    };
  }
}

export const kickSettingsRepository = new KickSettingsRepository();


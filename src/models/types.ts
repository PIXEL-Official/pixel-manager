export interface User {
  user_id: string;
  guild_id: string;
  username: string;
  joined_at: string; // ISO timestamp
  last_voice_time: string | null; // ISO timestamp
  last_message_time: string | null; // ISO timestamp
  total_minutes: number;
  week_start: string; // ISO timestamp
  warning_sent: boolean;
  status: 'active' | 'warned' | 'kicked';
  created_at?: string;
  updated_at?: string;
}

export interface VoiceSession {
  id?: string;
  user_id: string;
  joined_at: string; // ISO timestamp
  left_at: string | null; // ISO timestamp
  duration_minutes: number;
  created_at?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  warnedUsers: number;
  kickedUsers: number;
}

export interface UserWithSessions extends User {
  sessions: VoiceSession[];
}

export interface WeeklyReport {
  user_id: string;
  username: string;
  total_minutes: number;
  session_count: number;
  status: string;
  days_until_deadline: number;
}

export interface VoiceChannel {
  id?: number;
  guild_id: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChatChannel {
  id?: number;
  guild_id: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KickSettings {
  guild_id: string;
  kick_days: number;
  warning_days: number;
  required_minutes: number;
  created_at?: string;
  updated_at?: string;
}

-- Supabase에서 실행할 테이블 생성 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- Voice Channels 테이블 (추적할 음성 채널 목록)
CREATE TABLE IF NOT EXISTS voice_channels (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guild_id, channel_id)
);

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  username TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_voice_time TIMESTAMP WITH TIME ZONE,
  total_minutes INTEGER DEFAULT 0,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  warning_sent BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'warned', 'kicked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, guild_id)
);

-- Voice Sessions 테이블
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_voice_channels_guild ON voice_channels(guild_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_guild_status ON users(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_users_warning ON users(guild_id, warning_sent);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_joined ON voice_sessions(joined_at);

-- Updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_channels_updated_at 
  BEFORE UPDATE ON voice_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석 추가
COMMENT ON TABLE voice_channels IS '추적할 음성 채널 목록';
COMMENT ON TABLE users IS '디스코드 서버 멤버 추적 테이블';
COMMENT ON TABLE voice_sessions IS '음성 채널 세션 기록 테이블';
COMMENT ON COLUMN voice_channels.guild_id IS '디스코드 서버(길드) ID';
COMMENT ON COLUMN voice_channels.channel_id IS '디스코드 음성 채널 ID';
COMMENT ON COLUMN voice_channels.channel_name IS '채널 이름';
COMMENT ON COLUMN voice_channels.is_active IS '활성 상태 (추적 여부)';
COMMENT ON COLUMN users.user_id IS '디스코드 유저 ID';
COMMENT ON COLUMN users.guild_id IS '디스코드 서버(길드) ID';
COMMENT ON COLUMN users.joined_at IS '서버 가입 시간';
COMMENT ON COLUMN users.last_voice_time IS '마지막 음성 채널 접속 시간';
COMMENT ON COLUMN users.total_minutes IS '전체 누적 음성 채널 시간 (분) - 절대 리셋되지 않음';
COMMENT ON COLUMN users.week_start IS 'Kick Rule 시작 시점 (마지막 30분 달성 시각, 이후 7일간 유효)';
COMMENT ON COLUMN users.warning_sent IS '경고 발송 여부';
COMMENT ON COLUMN users.status IS '유저 상태: active(활성), warned(경고), kicked(강퇴됨)';


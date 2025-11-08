-- voice_channels 테이블만 추가하는 스크립트
-- 기존 테이블이 있는 경우를 위한 마이그레이션

-- Voice Channels 테이블 생성
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_voice_channels_guild ON voice_channels(guild_id, is_active);

-- Updated_at 자동 업데이트 트리거 (이미 함수는 존재하므로 트리거만 생성)
DROP TRIGGER IF EXISTS update_voice_channels_updated_at ON voice_channels;

CREATE TRIGGER update_voice_channels_updated_at 
  BEFORE UPDATE ON voice_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석 추가
COMMENT ON TABLE voice_channels IS '추적할 음성 채널 목록';
COMMENT ON COLUMN voice_channels.guild_id IS '디스코드 서버(길드) ID';
COMMENT ON COLUMN voice_channels.channel_id IS '디스코드 음성 채널 ID';
COMMENT ON COLUMN voice_channels.channel_name IS '채널 이름';
COMMENT ON COLUMN voice_channels.is_active IS '활성 상태 (추적 여부)';


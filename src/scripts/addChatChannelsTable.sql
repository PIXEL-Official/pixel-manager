-- Supabase에서 chat_channels 테이블을 추가하는 SQL
-- 추적할 채팅 채널 목록을 관리합니다.

-- chat_channels 테이블 생성
CREATE TABLE IF NOT EXISTS chat_channels (
    id SERIAL PRIMARY KEY,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, guild_id)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_chat_channels_guild 
    ON chat_channels(guild_id) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_chat_channels_channel 
    ON chat_channels(channel_id) 
    WHERE is_active = true;

-- updated_at 자동 업데이트 트리거 추가
DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON chat_channels;
CREATE TRIGGER update_chat_channels_updated_at
    BEFORE UPDATE ON chat_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 및 컬럼 설명 추가
COMMENT ON TABLE chat_channels IS '추적할 채팅 채널 목록';
COMMENT ON COLUMN chat_channels.id IS '고유 식별자';
COMMENT ON COLUMN chat_channels.channel_id IS '디스코드 채널 ID';
COMMENT ON COLUMN chat_channels.guild_id IS '디스코드 길드(서버) ID';
COMMENT ON COLUMN chat_channels.channel_name IS '채널 이름';
COMMENT ON COLUMN chat_channels.is_active IS '활성 상태';
COMMENT ON COLUMN chat_channels.created_at IS '생성 시간';
COMMENT ON COLUMN chat_channels.updated_at IS '수정 시간';


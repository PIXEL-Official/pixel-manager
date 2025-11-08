-- 기존 users 테이블에 last_message_time 컬럼 추가
-- Supabase Dashboard > SQL Editor에서 실행하세요

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.last_message_time IS '마지막 메시지 발송 시간';


-- kick_settings 테이블에 신규 조건 플래그 추가
ALTER TABLE kick_settings
  ADD COLUMN IF NOT EXISTS require_camera_on BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_voice_presence BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN kick_settings.require_camera_on IS '카메라 사용을 강제할지 여부';
COMMENT ON COLUMN kick_settings.require_voice_presence IS '음성 채널 참여를 강제할지 여부';

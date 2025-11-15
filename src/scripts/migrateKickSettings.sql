-- 통합 마이그레이션: kick_settings 테이블에 필요한 모든 컬럼 추가
-- 이 스크립트는 한 번에 실행하면 됩니다

-- 1. require_camera_on, require_voice_presence 플래그 추가
ALTER TABLE kick_settings
  ADD COLUMN IF NOT EXISTS require_camera_on BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_voice_presence BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN kick_settings.require_camera_on IS '카메라 사용을 강제할지 여부';
COMMENT ON COLUMN kick_settings.require_voice_presence IS '음성 채널 참여를 강제할지 여부';

-- 2. required_camera_minutes 컬럼 추가
ALTER TABLE kick_settings 
ADD COLUMN IF NOT EXISTS required_camera_minutes INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN kick_settings.required_camera_minutes IS 'Minimum minutes required with camera on in voice channels (0 = no requirement)';

-- 3. 기존 데이터 업데이트 (NULL 값이 있을 경우 기본값으로 설정)
UPDATE kick_settings 
SET 
  require_camera_on = COALESCE(require_camera_on, FALSE),
  require_voice_presence = COALESCE(require_voice_presence, FALSE),
  required_camera_minutes = COALESCE(required_camera_minutes, 0)
WHERE 
  require_camera_on IS NULL 
  OR require_voice_presence IS NULL 
  OR required_camera_minutes IS NULL;


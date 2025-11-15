-- 기존 users 테이블에 last_camera_time 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_camera_time TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.last_camera_time IS '마지막 카메라 사용 시간';

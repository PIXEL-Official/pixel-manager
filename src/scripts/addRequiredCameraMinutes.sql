-- Add required_camera_minutes field to kick_settings table
-- This sets the minimum minutes required with camera on in voice channels
-- Migration: addRequiredCameraMinutes.sql
-- Date: 2025-11-15

-- Add required_camera_minutes column to kick_settings table
ALTER TABLE kick_settings 
ADD COLUMN IF NOT EXISTS required_camera_minutes INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN kick_settings.required_camera_minutes IS 'Minimum minutes required with camera on in voice channels (0 = no requirement)';

-- Update existing settings to have required_camera_minutes = 0 (no requirement by default)
UPDATE kick_settings 
SET required_camera_minutes = 0 
WHERE required_camera_minutes IS NULL;


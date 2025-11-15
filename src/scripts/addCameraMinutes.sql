-- Add camera_on_minutes field to users table
-- This tracks the total minutes a user has spent in voice channels with camera on
-- Migration: addCameraMinutes.sql
-- Date: 2025-11-15

-- Add camera_on_minutes column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS camera_on_minutes INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN users.camera_on_minutes IS 'Total minutes spent in voice channels with camera on since reference date';

-- Update existing users to have camera_on_minutes = 0
UPDATE users 
SET camera_on_minutes = 0 
WHERE camera_on_minutes IS NULL;


-- Kick settings table to store configurable kick conditions per guild
CREATE TABLE IF NOT EXISTS kick_settings (
  guild_id TEXT PRIMARY KEY,
  kick_days INTEGER NOT NULL DEFAULT 7,
  warning_days INTEGER NOT NULL DEFAULT 6,
  required_minutes INTEGER NOT NULL DEFAULT 30,
  require_camera_on BOOLEAN NOT NULL DEFAULT FALSE,
  require_voice_presence BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add comments for documentation
COMMENT ON TABLE kick_settings IS 'Stores configurable kick condition settings per guild';
COMMENT ON COLUMN kick_settings.guild_id IS 'Discord guild (server) ID';
COMMENT ON COLUMN kick_settings.kick_days IS 'Number of days before a user is kicked for inactivity';
COMMENT ON COLUMN kick_settings.warning_days IS 'Number of days before warning is sent (should be less than kick_days)';
COMMENT ON COLUMN kick_settings.required_minutes IS 'Minimum required voice channel minutes per week';
COMMENT ON COLUMN kick_settings.require_camera_on IS 'Whether users must turn on their camera to satisfy kick conditions';
COMMENT ON COLUMN kick_settings.require_voice_presence IS 'Whether users must join voice channels to satisfy kick conditions';

-- Create index
CREATE INDEX IF NOT EXISTS idx_kick_settings_guild_id ON kick_settings(guild_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kick_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kick_settings_timestamp
  BEFORE UPDATE ON kick_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_kick_settings_updated_at();


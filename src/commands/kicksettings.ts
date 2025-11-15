import { 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits 
} from 'discord.js';
import { kickSettingsRepository } from '../repositories/kickSettingsRepository';
import { logger } from '../utils/logger';

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: '이 명령어는 서버에서만 사용할 수 있습니다.',
      ephemeral: true
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'view':
        await handleView(interaction);
        break;
      case 'set':
        await handleSet(interaction);
        break;
      case 'reset':
        await handleReset(interaction);
        break;
      default:
        await interaction.reply({
          content: '알 수 없는 하위 명령어입니다.',
          ephemeral: true
        });
    }
  } catch (error) {
    logger.error('Error executing kicksettings command', error);
    await interaction.reply({
      content: '명령어 실행 중 오류가 발생했습니다.',
      ephemeral: true
    });
  }
}

async function handleView(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const settings = await kickSettingsRepository.getSettings(guildId);

  const formatToggle = (value: boolean) => (value ? '✅ 활성화' : '❌ 비활성화');

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('⚙️ 킥 설정')
    .setDescription('현재 서버의 킥 조건 설정입니다.')
    .addFields(
      { 
        name: '🔴 강퇴 기준 일수', 
        value: `${settings.kick_days}일`, 
        inline: true 
      },
      { 
        name: '⚠️ 경고 기준 일수', 
        value: `${settings.warning_days}일`, 
        inline: true 
      },
      {
        name: '⏱️ 필요 활동 시간',
        value: `${settings.required_minutes}분`,
        inline: true
      },
      {
        name: '🎥 카메라 사용 필수',
        value: formatToggle(settings.require_camera_on),
        inline: true
      },
      {
        name: '🔊 음성 채널 참여 필수',
        value: formatToggle(settings.require_voice_presence),
        inline: true
      }
    )
    .setFooter({ 
      text: '설정을 변경하려면 /kicksettings set 명령어를 사용하세요.' 
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleSet(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const kickDays = interaction.options.getInteger('kick_days');
  const warningDays = interaction.options.getInteger('warning_days');
  const requiredMinutes = interaction.options.getInteger('required_minutes');
  const requireCameraOn = interaction.options.getBoolean('require_camera_on');
  const requireVoicePresence = interaction.options.getBoolean('require_voice_presence');

  // 유효성 검사 (먼저 진행)
  if (kickDays !== null && kickDays < 1) {
    await interaction.reply({
      content: '강퇴 기준 일수는 1일 이상이어야 합니다.',
      ephemeral: true
    });
    return;
  }

  if (warningDays !== null && warningDays < 1) {
    await interaction.reply({
      content: '경고 기준 일수는 1일 이상이어야 합니다.',
      ephemeral: true
    });
    return;
  }

  if (requiredMinutes !== null && requiredMinutes < 1) {
    await interaction.reply({
      content: '필요 활동 시간은 1분 이상이어야 합니다.',
      ephemeral: true
    });
    return;
  }

  // 최소한 하나의 옵션은 제공되어야 함
  if (
    kickDays === null &&
    warningDays === null &&
    requiredMinutes === null &&
    requireCameraOn === null &&
    requireVoicePresence === null
  ) {
    await interaction.reply({
      content: '최소한 하나의 설정 값을 지정해야 합니다.',
      ephemeral: true
    });
    return;
  }

  // 경고 일수는 강퇴 일수보다 작아야 함
  const currentSettings = await kickSettingsRepository.getSettings(guildId);
  const finalKickDays = kickDays ?? currentSettings.kick_days;
  const finalWarningDays = warningDays ?? currentSettings.warning_days;

  if (finalWarningDays >= finalKickDays) {
    await interaction.reply({
      content: `경고 기준 일수(${finalWarningDays}일)는 강퇴 기준 일수(${finalKickDays}일)보다 작아야 합니다.`,
      ephemeral: true
    });
    return;
  }

  // 설정 업데이트 (upsert 사용 - 없으면 생성, 있으면 업데이트)
  const newSettings = {
    guild_id: guildId,
    kick_days: kickDays ?? currentSettings.kick_days,
    warning_days: warningDays ?? currentSettings.warning_days,
    required_minutes: requiredMinutes ?? currentSettings.required_minutes,
    required_camera_minutes: currentSettings.required_camera_minutes,
    require_camera_on: requireCameraOn ?? currentSettings.require_camera_on,
    require_voice_presence: requireVoicePresence ?? currentSettings.require_voice_presence,
  };

  const updatedSettings = await kickSettingsRepository.upsertSettings(newSettings);

  if (!updatedSettings) {
    await interaction.reply({
      content: '⚠️ 설정 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ 설정이 변경되었습니다')
    .setDescription('킥 조건이 성공적으로 업데이트되었습니다.')
    .addFields(
      {
        name: '🔴 강퇴 기준 일수',
        value: `${updatedSettings.kick_days}일`,
        inline: true
      },
      {
        name: '⚠️ 경고 기준 일수',
        value: `${updatedSettings.warning_days}일`,
        inline: true
      },
      {
        name: '⏱️ 필요 활동 시간',
        value: `${updatedSettings.required_minutes}분`,
        inline: true
      },
      {
        name: '🎥 카메라 사용 필수',
        value: updatedSettings.require_camera_on ? '✅ 활성화' : '❌ 비활성화',
        inline: true
      },
      {
        name: '🔊 음성 채널 참여 필수',
        value: updatedSettings.require_voice_presence ? '✅ 활성화' : '❌ 비활성화',
        inline: true
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleReset(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  
  // 기본값으로 리셋
  const defaultSettings = {
    guild_id: guildId,
    kick_days: 7,
    warning_days: 6,
    required_minutes: 30,
    required_camera_minutes: 0,
    require_camera_on: false,
    require_voice_presence: false,
  };

  await kickSettingsRepository.upsertSettings(defaultSettings);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('🔄 설정이 초기화되었습니다')
    .setDescription('킥 조건이 기본값으로 리셋되었습니다.')
    .addFields(
      { 
        name: '🔴 강퇴 기준 일수', 
        value: '7일', 
        inline: true 
      },
      { 
        name: '⚠️ 경고 기준 일수', 
        value: '6일', 
        inline: true 
      },
      {
        name: '⏱️ 필요 활동 시간',
        value: '30분',
        inline: true
      },
      {
        name: '🎥 카메라 사용 필수',
        value: '❌ 비활성화',
        inline: true
      },
      {
        name: '🔊 음성 채널 참여 필수',
        value: '❌ 비활성화',
        inline: true
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}


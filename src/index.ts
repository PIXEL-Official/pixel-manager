import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { VoiceTracker } from './services/voiceTracker';
import { KickChecker } from './services/kickChecker';
import { voiceChannelRepository } from './repositories/voiceChannelRepository';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error('❌ DISCORD_TOKEN is not defined in .env file');
  process.exit(1);
}

if (!guildId) {
  console.error('❌ GUILD_ID is not defined in .env file');
  process.exit(1);
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates, // Voice state tracking
  ],
});

// Initialize services
const voiceTracker = new VoiceTracker(guildId);
let kickChecker: KickChecker;

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async (readyClient) => {
  logger.success(`Ready! Logged in as ${readyClient.user.tag}`);

  // Initialize kick checker
  kickChecker = new KickChecker(client, guildId);

  // Initialize active voice sessions for users already in tracked channels
  try {
    const guild = await client.guilds.fetch(guildId);
    await voiceTracker.initializeActiveUsers(guild);
    logger.info(`Initialized voice tracking for all tracked channels`);
  } catch (error) {
    logger.error('Error initializing active voice sessions', error);
  }

  // Schedule hourly checks (every hour at :00)
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled user check');
    try {
      await kickChecker.checkAndKickUsers();
    } catch (error) {
      logger.error('Error during scheduled check', error);
    }
  });

  logger.info('Cron job scheduled: Hourly user checks at :00');
});

// Track voice state changes
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    await voiceTracker.handleVoiceStateUpdate(oldState, newState);
  } catch (error) {
    logger.error('Error handling voice state update', error);
  }
});

// Track new members joining the server
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await voiceTracker.addNewMember(
      member.id,
      member.guild.id,
      member.user.username,
      member.joinedAt || new Date()
    );
  } catch (error) {
    logger.error('Error adding new member', error);
  }
});

// Admin commands
client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if user is admin (has ADMINISTRATOR permission)
  const isAdmin = message.member?.permissions.has('Administrator');

  // Simple ping command
  if (message.content === '!ping') {
    await message.reply('Pong! 🏓');
  }

  // Manual check command (admin only)
  if (message.content === '!check' && isAdmin) {
    await message.reply('⏳ 수동 체크를 시작합니다...');
    try {
      const result = await kickChecker.manualCheck();
      await message.reply(
        `✅ 체크 완료!\n\n` +
        `- 확인한 유저: ${result.total}명\n` +
        `- 경고 발송: ${result.warned}명\n` +
        `- 강퇴 처리: ${result.kicked}명`
      );
    } catch (error) {
      await message.reply('❌ 체크 중 오류가 발생했습니다.');
      logger.error('Manual check failed', error);
    }
  }

  // Status command (admin only)
  if (message.content === '!status' && isAdmin) {
    const activeCount = voiceTracker.getActiveSessionCount();
    const channels = await voiceChannelRepository.getActiveChannels(guildId);
    const channelList = channels.map(ch => `<#${ch.channel_id}>`).join(', ') || '없음';
    
    await message.reply(
      `📊 **현재 상태**\n\n` +
      `- 현재 음성 채널 접속 중: ${activeCount}명\n` +
      `- 추적 중인 채널: ${channelList}\n` +
      `- 총 추적 채널 수: ${channels.length}개`
    );
  }

  // Add channel command (admin only)
  if (message.content.startsWith('!addchannel') && isAdmin) {
    const args = message.content.split(' ');
    if (args.length < 2) {
      await message.reply('❌ 사용법: `!addchannel <채널_ID>`');
      return;
    }

    const channelId = args[1].replace(/[<>#]/g, ''); // Remove channel mention formatting
    
    try {
      const channel = await message.guild?.channels.fetch(channelId);
      
      if (!channel || !channel.isVoiceBased()) {
        await message.reply('❌ 유효한 음성 채널 ID가 아닙니다.');
        return;
      }

      const result = await voiceChannelRepository.addChannel({
        guild_id: guildId,
        channel_id: channelId,
        channel_name: channel.name,
        is_active: true,
      });

      if (result) {
        voiceTracker.addTrackedChannel(channelId);
        await message.reply(`✅ 음성 채널 <#${channelId}>가 추적 목록에 추가되었습니다.`);
        logger.info(`Added voice channel: ${channel.name} (${channelId})`);
      } else {
        await message.reply('❌ 이미 추적 목록에 있는 채널입니다.');
      }
    } catch (error) {
      await message.reply('❌ 채널 추가 중 오류가 발생했습니다.');
      logger.error('Error adding channel', error);
    }
  }

  // Remove channel command (admin only)
  if (message.content.startsWith('!removechannel') && isAdmin) {
    const args = message.content.split(' ');
    if (args.length < 2) {
      await message.reply('❌ 사용법: `!removechannel <채널_ID>`');
      return;
    }

    const channelId = args[1].replace(/[<>#]/g, '');
    
    try {
      const success = await voiceChannelRepository.removeChannel(channelId, guildId);
      
      if (success) {
        voiceTracker.removeTrackedChannel(channelId);
        await message.reply(`✅ 음성 채널 <#${channelId}>가 추적 목록에서 제거되었습니다.`);
        logger.info(`Removed voice channel: ${channelId}`);
      } else {
        await message.reply('❌ 채널 제거에 실패했습니다. 채널 ID를 확인해주세요.');
      }
    } catch (error) {
      await message.reply('❌ 채널 제거 중 오류가 발생했습니다.');
      logger.error('Error removing channel', error);
    }
  }

  // List channels command (admin only)
  if (message.content === '!listchannels' && isAdmin) {
    try {
      const channels = await voiceChannelRepository.getAllChannels(guildId);
      
      if (channels.length === 0) {
        await message.reply('📋 추적 중인 채널이 없습니다. `!addchannel <채널_ID>`로 채널을 추가하세요.');
        return;
      }

      let channelList = '📋 **추적 채널 목록**\n\n';
      
      channels.forEach((ch, index) => {
        const status = ch.is_active ? '✅ 활성' : '❌ 비활성';
        channelList += `${index + 1}. <#${ch.channel_id}> - ${status}\n`;
      });

      await message.reply(channelList);
    } catch (error) {
      await message.reply('❌ 채널 목록 조회 중 오류가 발생했습니다.');
      logger.error('Error listing channels', error);
    }
  }

  // Help command
  if (message.content === '!help') {
    let helpMessage = `
📚 **사용 가능한 명령어**

\`!ping\` - 봇 응답 확인
\`!help\` - 이 도움말 표시
`;

    if (isAdmin) {
      helpMessage += `
**관리자 전용 명령어:**
\`!check\` - 수동으로 유저 체크 실행
\`!status\` - 현재 봇 상태 확인
\`!addchannel <채널_ID>\` - 음성 채널을 추적 목록에 추가
\`!removechannel <채널_ID>\` - 음성 채널을 추적 목록에서 제거
\`!listchannels\` - 추적 중인 모든 채널 목록 보기
`;
    }

    await message.reply(helpMessage.trim());
  }
});

// Error handling
client.on(Events.Error, (error) => {
  logger.error('Discord client error', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error);
});

// Login to Discord with your client's token
client.login(token);


import { Client, GatewayIntentBits, Events, ChatInputCommandInteraction } from 'discord.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { VoiceTracker } from './services/voiceTracker';
import { KickChecker } from './services/kickChecker';
import { voiceChannelRepository } from './repositories/voiceChannelRepository';
import { logger } from './utils/logger';
import { deployCommands } from './utils/deployCommands';

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

  // Deploy slash commands
  await deployCommands(readyClient.user.id, guildId, token);

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

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'ping':
        await interaction.reply('🏓 Pong!');
        break;

      case 'check':
        await interaction.deferReply();
        try {
          const result = await kickChecker.manualCheck();
          await interaction.editReply(
            `✅ 체크 완료!\n\n` +
            `- 확인한 유저: ${result.total}명\n` +
            `- 경고 발송: ${result.warned}명\n` +
            `- 강퇴 처리: ${result.kicked}명`
          );
        } catch (error) {
          await interaction.editReply('❌ 체크 중 오류가 발생했습니다.');
          logger.error('Manual check failed', error);
        }
        break;

      case 'status':
        const activeCount = voiceTracker.getActiveSessionCount();
        const channels = await voiceChannelRepository.getActiveChannels(guildId);
        const channelList = channels.map(ch => `<#${ch.channel_id}>`).join(', ') || '없음';
        
        await interaction.reply(
          `📊 **현재 상태**\n\n` +
          `- 현재 음성 채널 접속 중: ${activeCount}명\n` +
          `- 추적 중인 채널: ${channelList}\n` +
          `- 총 추적 채널 수: ${channels.length}개`
        );
        break;

      case 'addchannel':
        const addChannel = interaction.options.getChannel('channel', true);
        
        // Type guard to check if it's a voice-based channel
        if (!('isVoiceBased' in addChannel) || !addChannel.isVoiceBased()) {
          await interaction.reply({ 
            content: '❌ 음성 채널만 추가할 수 있습니다.', 
            ephemeral: true
          });
          return;
        }

        try {
          const result = await voiceChannelRepository.addChannel({
            guild_id: guildId,
            channel_id: addChannel.id,
            channel_name: addChannel.name || `Channel ${addChannel.id}`,
            is_active: true,
          });

          if (result) {
            voiceTracker.addTrackedChannel(addChannel.id);
            await interaction.reply(`✅ 음성 채널 <#${addChannel.id}>가 추적 목록에 추가되었습니다.`);
            logger.info(`Added voice channel: ${addChannel.name} (${addChannel.id})`);
          } else {
            await interaction.reply({ 
              content: '❌ 이미 추적 목록에 있는 채널입니다.', 
              ephemeral: true
            });
          }
        } catch (error) {
          await interaction.reply({ 
            content: '❌ 채널 추가 중 오류가 발생했습니다.', 
            ephemeral: true
          });
          logger.error('Error adding channel', error);
        }
        break;

      case 'removechannel':
        const removeChannel = interaction.options.getChannel('channel', true);
        
        try {
          const success = await voiceChannelRepository.removeChannel(removeChannel.id, guildId);
          
          if (success) {
            voiceTracker.removeTrackedChannel(removeChannel.id);
            await interaction.reply(`✅ 음성 채널 <#${removeChannel.id}>가 추적 목록에서 제거되었습니다.`);
            logger.info(`Removed voice channel: ${removeChannel.id}`);
          } else {
            await interaction.reply({ 
              content: '❌ 채널 제거에 실패했습니다. 추적 목록에 없는 채널입니다.', 
              ephemeral: true
            });
          }
        } catch (error) {
          await interaction.reply({ 
            content: '❌ 채널 제거 중 오류가 발생했습니다.', 
            ephemeral: true
          });
          logger.error('Error removing channel', error);
        }
        break;

      case 'listchannels':
        try {
          const allChannels = await voiceChannelRepository.getAllChannels(guildId);
          
          if (allChannels.length === 0) {
            await interaction.reply('📋 추적 중인 채널이 없습니다. `/addchannel`로 채널을 추가하세요.');
            return;
          }

          let channelList = '📋 **추적 채널 목록**\n\n';
          
          allChannels.forEach((ch, index) => {
            const status = ch.is_active ? '✅ 활성' : '❌ 비활성';
            channelList += `${index + 1}. <#${ch.channel_id}> - ${status}\n`;
          });

          await interaction.reply(channelList);
        } catch (error) {
          await interaction.reply({ 
            content: '❌ 채널 목록 조회 중 오류가 발생했습니다.', 
            ephemeral: true
          });
          logger.error('Error listing channels', error);
        }
        break;

      case 'help':
        const helpMessage = `
📚 **사용 가능한 명령어**

\`/ping\` - 봇 응답 확인
\`/help\` - 이 도움말 표시

**관리자 전용 명령어:**
\`/check\` - 수동으로 유저 체크 실행
\`/status\` - 현재 봇 상태 확인
\`/addchannel\` - 음성 채널을 추적 목록에 추가
\`/removechannel\` - 음성 채널을 추적 목록에서 제거
\`/listchannels\` - 추적 중인 모든 채널 목록 보기
`;
        await interaction.reply(helpMessage.trim());
        break;

      default:
        await interaction.reply({ 
          content: '❌ 알 수 없는 명령어입니다.', 
          ephemeral: true
        });
    }
  } catch (error) {
    logger.error('Error handling interaction', error);
    
    const errorMessage = { 
      content: '❌ 명령어 실행 중 오류가 발생했습니다.', 
      ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Error handling
client.on(Events.Error, (error) => {
  logger.error('Discord client error', error);
});

process.on('unhandledRejection', (error: any) => {
  console.error('❌ Unhandled promise rejection:');
  console.error(error);
  logger.error('Unhandled promise rejection', error);
});

// Login to Discord with your client's token
client.login(token).catch((error) => {
  console.error('❌ Failed to login to Discord:');
  console.error(error);
  process.exit(1);
});


import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
} from 'discord.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { VoiceTracker } from './services/voiceTracker';
import { KickChecker } from './services/kickChecker';
import { voiceChannelRepository } from './repositories/voiceChannelRepository';
import { chatChannelRepository } from './repositories/chatChannelRepository';
import { userRepository } from './repositories/userRepository';
import { logger } from './utils/logger';
import { deployCommands } from './utils/deployCommands';
import { formatMinutes } from './utils/dateHelper';
import * as kicksettingsCommand from './commands/kicksettings';

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

  // Initialize kick checker with voiceTracker
  kickChecker = new KickChecker(client, guildId, voiceTracker);

  // Initialize active voice sessions for users already in tracked channels
  try {
    const guild = await client.guilds.fetch(guildId);
    await voiceTracker.initializeActiveUsers(guild);
    logger.info(`Initialized voice tracking for all tracked channels`);
  } catch (error) {
    logger.error('Error initializing active voice sessions', error);
  }

  // Schedule hourly checks (every hour at :00) - KST timezone
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const kstTimeStr = kstTime.toISOString().replace('T', ' ').substring(0, 19);
    logger.info(`Running scheduled user check at ${kstTimeStr} KST`);
    try {
      await kickChecker.checkAndKickUsers();
    } catch (error) {
      logger.error('Error during scheduled check', error);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  logger.info('Cron job scheduled: Hourly user checks at :00 (KST timezone)');
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

// Track messages for last message time
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Only track messages in the configured guild
  if (message.guildId !== guildId) return;

  // Only track messages in tracked chat channels
  if (!message.channelId) return;

  try {
    // 채널 자체가 추적 대상인지 확인
    let isTracked = await chatChannelRepository.isTrackedChannel(message.channelId, message.guildId);
    
    // 포럼 스레드의 경우, 부모 포럼 채널이 추적 대상인지 확인
    if (!isTracked && message.channel && 'isThread' in message.channel && message.channel.isThread() && message.channel.parentId) {
      isTracked = await chatChannelRepository.isTrackedChannel(message.channel.parentId, message.guildId);
    }
    
    if (!isTracked) return;

    await userRepository.updateLastMessageTime(message.author.id, message.guildId);
  } catch (error) {
    // Silent fail - don't spam logs for message tracking
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
          // 먼저 체크 실행
          const result = await kickChecker.manualCheck();
          
          // 상세 유저 목록 가져오기
          const userList = await kickChecker.getDetailedUserList();
          
          if (userList.length === 0) {
            await interaction.editReply('✅ 체크 완료! 현재 추적 중인 유저가 없습니다.');
            return;
          }

          // Pagination 설정 - 한 페이지당 20명씩 표시
          const itemsPerPage = 20;
          const totalPages = Math.ceil(userList.length / itemsPerPage);
          let currentPage = 0;

          // KST 변환 헬퍼
          const toKST = (date: Date) => {
            // UTC 시간에 9시간 추가
            return new Date(date.getTime() + (9 * 60 * 60 * 1000));
          };

          // 시간 포맷팅 헬퍼 (YYYY.MM.dd HH:mm KST)
          const formatDate = (isoString: string | null): string => {
            if (!isoString) return '없음';
            const utcDate = new Date(isoString);
            const kstDate = toKST(utcDate);
            
            const year = kstDate.getFullYear();
            const month = String(kstDate.getMonth() + 1).padStart(2, '0');
            const day = String(kstDate.getDate()).padStart(2, '0');
            const hours = String(kstDate.getHours()).padStart(2, '0');
            const minutes = String(kstDate.getMinutes()).padStart(2, '0');
            
            return `${year}.${month}.${day} ${hours}:${minutes}`;
          };

          // Embed 생성 함수
          const createEmbed = async (page: number) => {
            const start = page * itemsPerPage;
            const end = Math.min(start + itemsPerPage, userList.length);
            const pageUsers = userList.slice(start, end);
            
            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('📊 유저 활동 체크 결과')
              .setDescription(
                `✅ **체크 완료!**\n` +
                `확인: ${result.total}명 | 경고: ${result.warned}명 | 강퇴: ${result.kicked}명\n` +
                `페이지: ${page + 1}/${totalPages} (${start + 1}-${end}/${userList.length}명)`
              )
              .setTimestamp();

            // 각 유저를 리스트 형식으로 추가
            let listContent = '';
            for (let i = 0; i < pageUsers.length; i++) {
              const user = pageUsers[i];
              const idx = start + i + 1;
              
              const statusEmoji = user.meetsRequirement ? '✅' : '❌';
              const warningEmoji = user.status === 'warned' ? ' ⚠️' : '';
              const voiceEmoji = user.isCurrentlyInVoice ? '🔴' : '⚫';
              
              // Kick Rule 기간 계산 (referenceDate부터 7일 후까지)
              // referenceDate = 마지막으로 30분 달성한 시점
              const startDate = new Date(user.referenceDate);
              const deadlineDate = new Date(startDate);
              deadlineDate.setDate(deadlineDate.getDate() + 7);
              
              // KST 변환 후 포맷팅
              const formatDateTimeShort = (date: Date) => {
                const kstDate = toKST(date);
                const month = String(kstDate.getMonth() + 1).padStart(2, '0');
                const day = String(kstDate.getDate()).padStart(2, '0');
                const hours = String(kstDate.getHours()).padStart(2, '0');
                const minutes = String(kstDate.getMinutes()).padStart(2, '0');
                return `${month}.${day} ${hours}:${minutes}`;
              };
              const kickRulePeriod = `${formatDateTimeShort(startDate)} ~ ${formatDateTimeShort(deadlineDate)}`;
              
              listContent += `**${idx}.** ${statusEmoji} **${user.username}**${warningEmoji} ${voiceEmoji}\n`;
              listContent += `    📅 Kick Rule 기간: ${kickRulePeriod}\n`;
              listContent += `    ⏱️ 총 누적 활동 시간: **${formatMinutes(user.actualTotalMinutes)}**\n`;
              listContent += `    🎤 마지막 음성 접속: ${formatDate(user.lastVoiceTime)}\n`;
              listContent += `    💬 마지막 채팅: ${formatDate(user.lastMessageTime)}\n`;
              
              // 구분선 (마지막 항목 제외)
              if (i < pageUsers.length - 1) {
                listContent += '\n';
              }
            }

            embed.addFields({
              name: '\u200B',
              value: listContent,
              inline: false,
            });

            return embed;
          };

          // 버튼 생성 함수
          const createButtons = (page: number) => {
            return new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('prev')
                  .setLabel('◀ 이전')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(page === 0),
                new ButtonBuilder()
                  .setCustomId('next')
                  .setLabel('다음 ▶')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(page === totalPages - 1)
              );
          };

          // 초기 메시지 전송
          const message = await interaction.editReply({
            embeds: [await createEmbed(currentPage)],
            components: totalPages > 1 ? [createButtons(currentPage)] : [],
          });

          // 버튼 인터랙션 처리
          if (totalPages > 1) {
            const collector = message.createMessageComponentCollector({
              componentType: ComponentType.Button,
              time: 300000, // 5분
            });

            collector.on('collect', async (buttonInteraction) => {
              if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                  content: '❌ 이 버튼은 명령어를 실행한 사용자만 사용할 수 있습니다.',
                  ephemeral: true,
                });
                return;
              }

              if (buttonInteraction.customId === 'prev') {
                currentPage = Math.max(0, currentPage - 1);
              } else if (buttonInteraction.customId === 'next') {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
              }

              await buttonInteraction.update({
                embeds: [await createEmbed(currentPage)],
                components: [createButtons(currentPage)],
              });
            });

            collector.on('end', async () => {
              try {
                await interaction.editReply({
                  embeds: [await createEmbed(currentPage)],
                  components: [],
                });
              } catch (error) {
                // 메시지가 삭제된 경우 무시
              }
            });
          }
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
        
        // 채널 타입을 자동으로 감지
        const isVoice = 'isVoiceBased' in addChannel && addChannel.isVoiceBased();
        const isText = 'isTextBased' in addChannel && addChannel.isTextBased();
        const isForum = addChannel.type === ChannelType.GuildForum;

        if (!isVoice && !isText && !isForum) {
          await interaction.reply({ 
            content: '❌ 음성 채널, 텍스트 채널 또는 포럼 채널만 추가할 수 있습니다.', 
            ephemeral: true
          });
          return;
        }

        try {
          if (isVoice) {
            // 🎤 음성 채널 추가
            const result = await voiceChannelRepository.addChannel({
              guild_id: guildId,
              channel_id: addChannel.id,
              channel_name: addChannel.name || `Channel ${addChannel.id}`,
              is_active: true,
            });

            if (result) {
              voiceTracker.addTrackedChannel(addChannel.id);
              await interaction.reply(`✅ 🎤 음성 채널 <#${addChannel.id}>이(가) 추적 목록에 추가되었습니다.`);
              logger.info(`Added voice channel: ${addChannel.name} (${addChannel.id})`);
            } else {
              await interaction.reply({ 
                content: '❌ 이미 추적 목록에 있는 음성 채널입니다.', 
                ephemeral: true
              });
            }
          } else {
            // 💬 텍스트 채널 또는 📋 포럼 채널 추가
            const result = await chatChannelRepository.addChannel({
              guild_id: guildId,
              channel_id: addChannel.id,
              channel_name: addChannel.name || `Channel ${addChannel.id}`,
              is_active: true,
            });

            if (result) {
              const emoji = isForum ? '📋' : '💬';
              const type = isForum ? '포럼' : '채팅';
              await interaction.reply(`✅ ${emoji} ${type} 채널 <#${addChannel.id}>이(가) 추적 목록에 추가되었습니다.${isForum ? '\n포럼 내 모든 스레드의 메시지가 추적됩니다.' : ''}`);
              logger.info(`Added ${type.toLowerCase()} channel: ${addChannel.name} (${addChannel.id})`);
            } else {
              await interaction.reply({ 
                content: `❌ 이미 추적 목록에 있는 ${isForum ? '포럼' : '채팅'} 채널입니다.`, 
                ephemeral: true
              });
            }
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
          // 음성 채널과 채팅 채널 모두 시도
          const voiceSuccess = await voiceChannelRepository.removeChannel(removeChannel.id, guildId);
          const chatSuccess = await chatChannelRepository.removeChannel(removeChannel.id, guildId);
          
          if (voiceSuccess) {
            voiceTracker.removeTrackedChannel(removeChannel.id);
            await interaction.reply(`✅ 🎤 음성 채널 <#${removeChannel.id}>이(가) 추적 목록에서 제거되었습니다.`);
            logger.info(`Removed voice channel: ${removeChannel.id}`);
          } else if (chatSuccess) {
            await interaction.reply(`✅ 💬 채팅 채널 <#${removeChannel.id}>이(가) 추적 목록에서 제거되었습니다.`);
            logger.info(`Removed chat channel: ${removeChannel.id}`);
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
          const voiceChannels = await voiceChannelRepository.getAllChannels(guildId);
          const chatChannels = await chatChannelRepository.getAllChannels(guildId);
          
          if (voiceChannels.length === 0 && chatChannels.length === 0) {
            await interaction.reply('📋 추적 중인 채널이 없습니다. `/addchannel`로 채널을 추가하세요.');
            return;
          }

          let channelList = '📋 **추적 중인 채널 목록**\n\n';
          
          // 음성 채널 목록
          if (voiceChannels.length > 0) {
            channelList += '**🎤 음성 채널**\n';
            voiceChannels.forEach((ch, index) => {
              const status = ch.is_active ? '✅' : '❌';
              channelList += `${index + 1}. ${status} <#${ch.channel_id}>\n`;
            });
            channelList += '\n';
          }

          // 채팅 채널 목록
          if (chatChannels.length > 0) {
            channelList += '**💬 채팅 채널**\n';
            chatChannels.forEach((ch, index) => {
              const status = ch.is_active ? '✅' : '❌';
              channelList += `${index + 1}. ${status} <#${ch.channel_id}>\n`;
            });
          }

          await interaction.reply(channelList.trim());
        } catch (error) {
          await interaction.reply({ 
            content: '❌ 채널 목록 조회 중 오류가 발생했습니다.', 
            ephemeral: true
          });
          logger.error('Error listing channels', error);
        }
        break;

      case 'sync':
        await interaction.deferReply();
        try {
          const guild = await client.guilds.fetch(guildId);
          const members = await guild.members.fetch();
          
          let added = 0;
          let skipped = 0;
          
          for (const [memberId, member] of members) {
            // 봇 제외
            if (member.user.bot) {
              skipped++;
              continue;
            }
            
            // DB에 추가 시도 (이미 존재하면 스킵됨)
            await voiceTracker.addNewMember(
              memberId,
              guildId,
              member.user.username,
              member.joinedAt || new Date()
            );
            
            added++;
          }
          
          await interaction.editReply(
            `✅ 서버 멤버 동기화 완료!\n\n` +
            `- 총 멤버: ${members.size}명\n` +
            `- 처리됨: ${added}명\n` +
            `- 스킵됨 (봇): ${skipped}명\n\n` +
            `이제 \`/check\` 명령어를 다시 실행해보세요!`
          );
          logger.info(`Synced ${added} members to database`);
        } catch (error) {
          await interaction.editReply('❌ 멤버 동기화 중 오류가 발생했습니다.');
          logger.error('Sync failed', error);
        }
        break;

      case 'kicksettings':
        await kicksettingsCommand.execute(interaction);
        break;

      case 'help':
        const helpMessage = `
📚 **사용 가능한 명령어**

\`/ping\` - 봇 응답 확인
\`/help\` - 이 도움말 표시

**관리자 전용 명령어:**
\`/sync\` - 서버의 모든 멤버를 DB에 등록 (초기 설정 시 1회 실행)
\`/check\` - 수동으로 유저 체크 실행
\`/status\` - 현재 봇 상태 확인
\`/kicksettings\` - 킥 조건 설정 관리 (view/set/reset)

**📋 채널 관리 (자동 감지):**
\`/addchannel\` - 채널을 추적 목록에 추가 (음성 🎤 / 텍스트 💬 / 포럼 📋 자동 구분)
\`/removechannel\` - 채널을 추적 목록에서 제거
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


import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits 
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// 명령어 정의
export const commands = {
  ping: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('봇 응답 확인'),

  check: new SlashCommandBuilder()
    .setName('check')
    .setDescription('수동으로 유저 활동 체크 및 강퇴 실행')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  status: new SlashCommandBuilder()
    .setName('status')
    .setDescription('현재 봇 상태 및 통계 확인')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  addchannel: new SlashCommandBuilder()
    .setName('addchannel')
    .setDescription('채널을 추적 목록에 추가 (음성/채팅 자동 감지)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('추가할 채널')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  removechannel: new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('채널을 추적 목록에서 제거')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('제거할 채널')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  listchannels: new SlashCommandBuilder()
    .setName('listchannels')
    .setDescription('추적 중인 모든 채널 목록 보기 (음성/채팅)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  help: new SlashCommandBuilder()
    .setName('help')
    .setDescription('사용 가능한 명령어 목록 표시'),

  sync: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('서버의 모든 멤버를 데이터베이스에 동기화 (초기 설정용)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
};


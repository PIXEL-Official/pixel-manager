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

  kicksettings: new SlashCommandBuilder()
    .setName('kicksettings')
    .setDescription('킥 조건 설정 관리')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('현재 킥 조건 설정 보기')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('킥 조건 설정 변경')
        .addIntegerOption(option =>
          option
            .setName('kick_days')
            .setDescription('강퇴 기준 일수 (예: 7일)')
            .setMinValue(1)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('warning_days')
            .setDescription('경고 기준 일수 (예: 6일)')
            .setMinValue(1)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('required_minutes')
            .setDescription('필요 활동 시간 (분 단위, 예: 30분)')
            .setMinValue(1)
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('require_camera_on')
            .setDescription('카메라 사용을 필수 조건으로 설정')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('require_voice_presence')
            .setDescription('음성 채널 참여를 필수 조건으로 설정')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('킥 조건을 기본값으로 초기화 (7일, 6일, 30분)')
    ),
};


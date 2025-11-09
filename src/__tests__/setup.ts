import { beforeAll, vi } from 'vitest';

// 환경 변수 설정
beforeAll(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.DISCORD_TOKEN = 'test-discord-token';
  process.env.GUILD_ID = 'test-guild-id';
});

// 콘솔 로그 억제 (필요시 주석 해제)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };

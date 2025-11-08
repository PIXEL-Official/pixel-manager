# Pixel Manager Discord Bot

TypeScript로 작성된 디스코드 봇입니다.

## 설치

```bash
pnpm install
```

## 환경 설정

1. `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:
```bash
cp .env.example .env
```

2. `.env` 파일에 필요한 환경 변수를 입력합니다:
```
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_guild_id_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**참고:** 음성 채널 ID는 더 이상 환경변수로 설정하지 않습니다. 대신 `!addchannel` 명령어를 통해 Supabase에서 관리됩니다.

## 봇 토큰 발급 방법

1. [Discord Developer Portal](https://discord.com/developers/applications)에 접속
2. "New Application" 클릭
3. 애플리케이션 이름 입력 후 생성
4. 좌측 메뉴에서 "Bot" 선택
5. "Reset Token" 클릭하여 토큰 생성 및 복사
6. "MESSAGE CONTENT INTENT" 활성화 (메시지 내용 읽기 위해 필요)
7. 좌측 메�로에서 "OAuth2" > "URL Generator" 선택
8. SCOPES에서 "bot" 선택
9. BOT PERMISSIONS에서 필요한 권한 선택
10. 생성된 URL로 봇을 서버에 초대

## 실행

### 개발 모드
```bash
pnpm dev
```

### 빌드
```bash
pnpm build
```

### 프로덕션 모드
```bash
pnpm start
```

## 기능

### 자동 스터디 관리
- 일주일에 30분 이상 지정된 음성 채널에 접속하지 않은 유저 자동 강퇴
- 강퇴 24시간 전 자동 경고 DM 발송
- 1시간마다 자동으로 유저 활동 체크
- 음성 채널 입장/퇴장 시간 자동 추적 및 기록

### 관리자 명령어

- `!ping` - 봇 응답 확인
- `!check` - 수동으로 유저 체크 및 강퇴 실행
- `!status` - 현재 음성 채널 접속 상태 확인
- `!addchannel <채널_ID>` - 음성 채널을 추적 목록에 추가
- `!removechannel <채널_ID>` - 음성 채널을 추적 목록에서 제거
- `!listchannels` - 추적 중인 모든 채널 목록 보기
- `!help` - 사용 가능한 명령어 목록 표시

### 일반 명령어

- `!ping` - Pong! 응답
- `!help` - 도움말 표시

## Supabase 설정

1. [Supabase](https://supabase.com/)에서 새 프로젝트 생성
2. SQL Editor에서 `src/scripts/createTables.sql` 파일 실행
3. Settings > API에서 Project URL과 anon public key를 복사하여 `.env`에 입력

## 프로젝트 구조

```
pixel-manager/
├── src/
│   ├── index.ts              # 메인 엔트리 포인트
│   ├── database/
│   │   └── supabase.ts       # Supabase 클라이언트
│   ├── models/
│   │   └── types.ts          # TypeScript 타입 정의
│   ├── repositories/
│   │   ├── userRepository.ts         # 유저 데이터 관리
│   │   ├── voiceSessionRepository.ts # 세션 데이터 관리
│   │   └── voiceChannelRepository.ts # 음성 채널 관리
│   ├── services/
│   │   ├── voiceTracker.ts   # 음성 채널 추적
│   │   ├── kickChecker.ts    # 자동 강퇴 로직
│   │   └── statsService.ts   # 통계 서비스
│   ├── utils/
│   │   ├── dateHelper.ts     # 날짜 계산 유틸
│   │   └── logger.ts         # 로깅 시스템
│   └── scripts/
│       └── createTables.sql  # DB 테이블 생성 SQL
├── dist/                     # 빌드 결과물
├── .env                      # 환경 변수 (git에 포함되지 않음)
├── .env.example              # 환경 변수 예시
├── package.json
├── tsconfig.json
└── README.md
```

## 작동 원리

1. **신규 멤버 가입**: 서버에 새로운 멤버가 가입하면 자동으로 DB에 등록
2. **음성 채널 관리**: 관리자가 `!addchannel` 명령어로 추적할 음성 채널을 추가합니다. 여러 채널을 동시에 추적할 수 있습니다.
3. **음성 채널 추적**: 등록된 모든 음성 채널의 입장/퇴장 시간을 실시간으로 추적
4. **주간 시간 계산**: 각 유저의 주간 누적 음성 채널 시간 자동 계산
5. **1시간마다 체크**:
   - 6일 경과 + 30분 미달 유저에게 경고 DM 발송
   - 7일 경과 + 30분 미달 유저 자동 강퇴
6. **데이터 저장**: 모든 활동은 Supabase에 기록되어 대시보드에서 활용 가능

## 주의사항

- 봇이 유저에게 DM을 보내려면 해당 유저가 서버에서 DM을 허용해야 합니다
- 봇에게 멤버 강퇴 권한(KICK_MEMBERS)이 필요합니다
- 채널 추가는 `!addchannel` 명령어로 관리하며, 여러 채널을 동시에 추적할 수 있습니다
- 1시간마다 자동 체크가 실행되므로 봇을 24시간 가동해야 합니다
- 봇 시작 시 Supabase에 등록된 활성 채널들만 추적합니다


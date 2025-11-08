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

**참고:** 음성 채널 ID는 더 이상 환경변수로 설정하지 않습니다. 대신 `/addchannel` 슬래시 명령어를 통해 Supabase에서 관리됩니다.

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

## 클라우드 배포 (Railway, Render 등)

### 빌드 명령어 설정
클라우드 서비스의 설정에서 다음과 같이 설정하세요:

**Build Command:**
```bash
pnpm install && pnpm build
```

**Start Command:**
```bash
pnpm start
```

### 환경 변수 설정
클라우드 서비스의 환경 변수 설정에서 다음을 추가하세요:
- `DISCORD_TOKEN`
- `GUILD_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Docker 사용 시
Dockerfile이 포함되어 있습니다. Docker를 지원하는 클라우드 서비스에서는:

```bash
docker build -t pixel-manager .
docker run --env-file .env pixel-manager
```

## 기능

### 자동 스터디 관리
- 일주일에 30분 이상 지정된 음성 채널에 접속하지 않은 유저 자동 강퇴
- 강퇴 24시간 전 자동 경고 DM 발송
- 1시간마다 자동으로 유저 활동 체크
- 음성 채널 입장/퇴장 시간 자동 추적 및 기록

### 슬래시 명령어

#### 일반 명령어
- `/ping` - 봇 응답 확인
- `/help` - 사용 가능한 명령어 목록 표시

#### 관리자 전용 명령어
- `/sync` - 서버의 모든 멤버를 데이터베이스에 등록 (초기 설정 시 1회 실행 필수)
- `/check` - 수동으로 유저 체크 및 강퇴 실행
  - 한 페이지당 20명씩 리스트 형식으로 표시
  - 각 유저별 정보:
    - **닉네임** (조건 충족 ✅/미달 ❌, 경고 ⚠️, 접속상태 🔴/⚫)
    - 📅 **Kick Rule 기간**: 마지막 30분 달성 시점 ~ 7일 후 (MM.DD HH:mm KST)
    - ⏱️ **총 누적 활동 시간**: 전체 음성 채널 시간 (실시간 반영, 리셋 없음)
    - 🎤 **마지막 음성 접속 시간** (YYYY.MM.dd HH:mm KST)
    - 💬 **마지막 채팅 시간** (YYYY.MM.dd HH:mm KST)
  - 페이지네이션으로 모든 유저 확인 가능
- `/status` - 현재 음성 채널 접속 상태 확인

**📋 채널 관리 (자동 감지):**
- `/addchannel` - 채널을 추적 목록에 추가
  - 음성 채널 🎤: 음성 접속 시간 추적
  - 텍스트 채널 💬: 채팅 메시지 활동 추적
  - 포럼 채널 📋: 포럼 내 모든 스레드의 메시지 활동 추적
- `/removechannel` - 채널을 추적 목록에서 제거
- `/listchannels` - 추적 중인 모든 채널 목록 보기

## Supabase 설정

1. [Supabase](https://supabase.com/)에서 새 프로젝트 생성
2. SQL Editor에서 스크립트 실행:
   - **신규 설치**: `src/scripts/createTables.sql` 파일 전체 실행
   - **기존 DB 업데이트**:
     - `voice_channels` 테이블 추가: `src/scripts/addVoiceChannelsTable.sql` 실행
     - `chat_channels` 테이블 추가: `src/scripts/addChatChannelsTable.sql` 실행
     - `last_message_time` 컬럼 추가: `src/scripts/addLastMessageTime.sql` 실행
3. Settings > API에서 Project URL과 anon public key를 복사하여 `.env`에 입력

## 프로젝트 구조

```
pixel-manager/
├── src/
│   ├── index.ts              # 메인 엔트리 포인트
│   ├── commands/
│   │   └── index.ts          # 슬래시 명령어 정의
│   ├── database/
│   │   └── supabase.ts       # Supabase 클라이언트
│   ├── models/
│   │   └── types.ts          # TypeScript 타입 정의
│   ├── repositories/
│   │   ├── userRepository.ts         # 유저 데이터 관리
│   │   ├── voiceSessionRepository.ts # 세션 데이터 관리
│   │   ├── voiceChannelRepository.ts # 음성 채널 관리
│   │   └── chatChannelRepository.ts  # 채팅 채널 관리
│   ├── services/
│   │   ├── voiceTracker.ts   # 음성 채널 추적
│   │   ├── kickChecker.ts    # 자동 강퇴 로직
│   │   └── statsService.ts   # 통계 서비스
│   ├── utils/
│   │   ├── dateHelper.ts     # 날짜 계산 유틸
│   │   ├── logger.ts         # 로깅 시스템
│   │   └── deployCommands.ts # 슬래시 명령어 배포
│   └── scripts/
│       ├── createTables.sql           # DB 테이블 생성 SQL (신규)
│       ├── addVoiceChannelsTable.sql  # voice_channels 추가 (기존 DB)
│       ├── addChatChannelsTable.sql   # chat_channels 추가 (기존 DB)
│       └── addLastMessageTime.sql     # last_message_time 추가 (기존 DB)
├── dist/                     # 빌드 결과물
├── .env                      # 환경 변수 (git에 포함되지 않음)
├── .env.example              # 환경 변수 예시
├── package.json
├── tsconfig.json
└── README.md
```

## 작동 원리

1. **초기 설정**: 
   - 봇 설치 후 **반드시 `/sync` 명령어를 1회 실행**하여 기존 멤버들을 DB에 등록
   - 이후 신규 멤버는 서버 가입 시 자동으로 DB에 등록됨
2. **채널 관리 (자동 감지)**: 
   - `/addchannel` 명령어로 채널을 추가하면 **채널 타입을 자동으로 감지**합니다
   - **음성 채널** (🎤): 음성 접속 시간을 추적
   - **텍스트 채널** (💬): 메시지 활동을 추적 (마지막 채팅 시간 기록)
   - **포럼 채널** (📋): 포럼 내 모든 스레드의 메시지 활동을 추적
   - 여러 채널을 동시에 추적 가능
3. **실시간 추적**:
   - **음성 채널**: 등록된 모든 음성 채널의 입장/퇴장 시간을 실시간으로 추적
   - **채팅 활동**: 등록된 텍스트 채널 및 포럼 채널(스레드 포함)에서의 메시지 마지막 전송 시간을 기록
4. **Kick Rule 시스템** (핵심 로직):
   - **30분 달성 시**: 해당 시점이 새로운 `referenceDate`로 설정됨 (새로운 7일 기간 시작)
   - **7일 기간**: `referenceDate` ~ `referenceDate + 7일`
   - **누적 시간**: `total_minutes`는 **절대 리셋되지 않고** 계속 누적 (전체 활동 시간 기록)
   - **예시**:
     - 11-04에 30분 달성 → Kick Rule 기간: 11-04 ~ 11-11 (누적: 30분+)
     - 11-06에 60분 달성 → Kick Rule 기간: 11-06 ~ 11-13 (누적: 60분+, 기간만 갱신)
5. **시간 계산**: 
   - **실시간 반영**: `/check` 명령어 실행 시 현재 접속 중인 시간도 포함하여 계산
   - **영구 기록**: 모든 활동 시간은 영구적으로 누적되어 기록됨
6. **1시간마다 자동 체크**:
   - 6일 경과 + 30분 미달 유저에게 경고 DM 발송
   - 7일 경과 + 30분 미달 유저 자동 강퇴
7. **데이터 저장**: 모든 활동은 Supabase에 기록되어 대시보드에서 활용 가능

## 주의사항

- **⚠️ 중요**: 봇 설치 후 반드시 `/sync` 명령어를 1회 실행하여 기존 서버 멤버를 DB에 등록해야 합니다
- 봇이 유저에게 DM을 보내려면 해당 유저가 서버에서 DM을 허용해야 합니다
- 봇에게 멤버 강퇴 권한(KICK_MEMBERS)이 필요합니다
- 채널 추가는 `/addchannel` 명령어로 관리하며, 여러 채널을 동시에 추적할 수 있습니다
- 1시간마다 자동 체크가 실행되므로 봇을 24시간 가동해야 합니다
- 봇 시작 시 Supabase에 등록된 활성 채널들만 추적합니다


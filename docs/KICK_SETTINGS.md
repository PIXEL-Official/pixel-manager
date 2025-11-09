# Kick Settings (킥 조건 설정)

## 개요

Pixel Manager는 이제 킥 조건을 데이터베이스에 저장하여 Discord 슬래시 명령어로 동적으로 설정할 수 있습니다. 각 길드(서버)별로 독립적인 킥 조건을 설정할 수 있습니다.

## Discord 명령어로 설정하기 (추천)

관리자는 Discord에서 직접 `/kicksettings` 명령어를 사용하여 설정을 관리할 수 있습니다.

### 1. 현재 설정 보기

```
/kicksettings view
```

현재 길드의 킥 조건 설정을 확인합니다. 설정이 없으면 기본값이 표시됩니다.

### 2. 설정 변경하기

```
/kicksettings set kick_days:10 warning_days:8 required_minutes:60
```

원하는 설정만 지정할 수 있습니다:
- `/kicksettings set kick_days:10` - 강퇴 기준 일수만 변경
- `/kicksettings set required_minutes:60` - 필요 시간만 변경
- `/kicksettings set warning_days:5 kick_days:7` - 여러 값 동시 변경

**유효성 검사:**
- ⚠️ `warning_days`는 항상 `kick_days`보다 작아야 합니다
- ⚠️ 모든 값은 1 이상이어야 합니다

### 3. 기본값으로 초기화

```
/kicksettings reset
```

설정을 기본값(7일, 6일, 30분)으로 되돌립니다.

## 설정 가능한 값

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `kick_days` | number | 7 | 강퇴까지 걸리는 일수 |
| `warning_days` | number | 6 | 경고 발송 시점 (일수) |
| `required_minutes` | number | 30 | 필요한 최소 활동 시간 (분) |

## 데이터베이스 테이블 생성

먼저 Supabase에서 다음 SQL 스크립트를 실행하여 테이블을 생성합니다:

```sql
-- src/scripts/createKickSettingsTable.sql 파일 참조
```

## API 사용법

### 1. 설정 조회

```typescript
import { kickSettingsRepository } from './repositories/kickSettingsRepository';

// 길드의 킥 설정 조회 (없으면 기본값 반환)
const settings = await kickSettingsRepository.getSettings('GUILD_ID');
console.log(settings);
// {
//   guild_id: 'GUILD_ID',
//   kick_days: 7,
//   warning_days: 6,
//   required_minutes: 30
// }
```

### 2. 설정 생성/업데이트 (Upsert)

```typescript
// 길드의 킥 설정 생성 또는 업데이트
const newSettings = await kickSettingsRepository.upsertSettings({
  guild_id: 'GUILD_ID',
  kick_days: 10,          // 10일로 변경
  warning_days: 8,        // 8일로 변경
  required_minutes: 60,   // 60분으로 변경
});
```

### 3. 일부 설정만 업데이트

```typescript
// 특정 필드만 업데이트
const updated = await kickSettingsRepository.updateSettings('GUILD_ID', {
  required_minutes: 45,  // 필요 시간만 45분으로 변경
});
```

### 4. 설정 삭제 (기본값으로 복귀)

```typescript
// 설정 삭제 (기본값 사용)
const deleted = await kickSettingsRepository.deleteSettings('GUILD_ID');
```

## KickChecker에서 설정 사용

`KickChecker` 클래스는 자동으로 데이터베이스에서 설정을 읽어옵니다:

```typescript
// 설정을 새로고침하고 싶을 때
await kickChecker.refreshSettings();
```

설정이 변경되면 다음 체크 주기부터 자동으로 반영됩니다.

## 예제 시나리오

### 시나리오 1: 기본 설정 사용
```typescript
// 설정이 없으면 자동으로 기본값 사용:
// - 7일 후 강퇴
// - 6일 후 경고
// - 30분 필요
```

### 시나리오 2: 더 엄격한 설정
```typescript
await kickSettingsRepository.upsertSettings({
  guild_id: 'GUILD_ID',
  kick_days: 5,           // 5일로 단축
  warning_days: 4,        // 4일 후 경고
  required_minutes: 60,   // 1시간 필요
});
```

### 시나리오 3: 더 느슨한 설정
```typescript
await kickSettingsRepository.upsertSettings({
  guild_id: 'GUILD_ID',
  kick_days: 14,          // 2주로 연장
  warning_days: 12,       // 12일 후 경고
  required_minutes: 15,   // 15분만 필요
});
```

## 주의사항

1. **warning_days는 항상 kick_days보다 작아야 합니다**
   - 예: `kick_days: 7, warning_days: 6` ✅
   - 예: `kick_days: 7, warning_days: 8` ❌

2. **설정 변경 후 즉시 반영되지 않습니다**
   - 다음 자동 체크 주기 또는 수동 체크 시 반영됩니다
   - 즉시 적용이 필요하면 `kickChecker.refreshSettings()`를 호출하세요

3. **각 길드별로 독립적인 설정**
   - 여러 길드를 관리하는 경우 각각 별도로 설정해야 합니다

4. **데이터베이스 접근 권한**
   - 설정 변경은 Supabase 관리자 또는 적절한 권한이 있는 사용자만 가능합니다

## 설정값 권장사항

| 사용 사례 | kick_days | warning_days | required_minutes |
|----------|-----------|--------------|------------------|
| 엄격한 스터디 | 5 | 4 | 60 |
| 일반 스터디 | 7 | 6 | 30 |
| 느슨한 커뮤니티 | 14 | 12 | 15 |
| 테스트 환경 | 1 | 0 | 5 |

## 문제 해결

### Q: 설정이 적용되지 않아요
A: `kickChecker.refreshSettings()`를 호출하거나 봇을 재시작하세요.

### Q: 기본값으로 되돌리고 싶어요
A: `kickSettingsRepository.deleteSettings('GUILD_ID')`를 호출하세요.

### Q: 여러 길드의 설정을 한 번에 변경할 수 있나요?
A: 각 길드별로 개별적으로 설정해야 합니다.


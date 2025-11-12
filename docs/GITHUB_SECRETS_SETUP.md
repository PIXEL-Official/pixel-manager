# GitHub Secrets 설정 가이드

이 문서는 GitHub Actions를 통한 Oracle Cloud 배포에 필요한 Secrets 설정 방법을 단계별로 안내합니다.

## 목차

- [Secrets 설정 위치](#secrets-설정-위치)
- [필수 Secrets 목록](#필수-secrets-목록)
- [각 Secret 설정 방법](#각-secret-설정-방법)
- [설정 확인](#설정-확인)

## Secrets 설정 위치

1. GitHub 저장소 페이지로 이동
2. **Settings** 탭 클릭
3. 좌측 메뉴에서 **Secrets and variables** > **Actions** 클릭
4. **New repository secret** 버튼 클릭

## 필수 Secrets 목록

### ✅ OCI 인증 관련 (7개)

| Secret Name | 설명 |
|------------|------|
| `OCI_REGISTRY` | Oracle Container Registry URL |
| `OCI_NAMESPACE` | OCI Tenancy Namespace |
| `OCI_USERNAME` | OCIR 로그인 사용자명 |
| `OCI_AUTH_TOKEN` | OCI Auth Token |
| `OCI_USER_OCID` | User OCID |
| `OCI_TENANCY_OCID` | Tenancy OCID |
| `OCI_FINGERPRINT` | API Key Fingerprint |

### ✅ OCI 인프라 관련 (2개)

| Secret Name | 설명 |
|------------|------|
| `OCI_API_PRIVATE_KEY` | API Private Key 전체 내용 |
| `OCI_INSTANCE_IP` | Compute Instance Public IP |
| `OCI_SSH_PRIVATE_KEY` | SSH Private Key 전체 내용 |

### ✅ 애플리케이션 환경 변수 (4개)

| Secret Name | 설명 |
|------------|------|
| `DISCORD_TOKEN` | Discord Bot Token |
| `GUILD_ID` | Discord Server (Guild) ID |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Key |

### 🔔 알림 (선택사항, 1개)

| Secret Name | 설명 |
|------------|------|
| `DISCORD_WEBHOOK_URL` | 배포 알림을 받을 Discord Webhook URL |

**총 필수 Secrets: 14개**

---

## 각 Secret 설정 방법

### 1. OCI_REGISTRY

**값 예시:**
```
icn.ocir.io
```

**찾는 방법:**
- 리전에 따라 다름
- 서울: `icn.ocir.io`
- 도쿄: `nrt.ocir.io`
- 춘천: `yny.ocir.io`

---

### 2. OCI_NAMESPACE

**값 예시:**
```
axabcd1234ef
```

**찾는 방법:**
1. OCI Console 로그인
2. **Developer Services** > **Container Registry** 이동
3. 페이지 상단에 표시된 Namespace 확인
4. 또는 **Tenancy Details**에서도 확인 가능

---

### 3. OCI_USERNAME

**값 예시:**
```
axabcd1234ef/oracleidentitycloudservice/your.email@example.com
```

**형식:**
```
<namespace>/<username>
```

**찾는 방법:**
1. Namespace: 위에서 찾은 값 사용
2. Username: OCI 로그인 시 사용하는 이메일 또는 사용자명
   - Federated User의 경우: `oracleidentitycloudservice/` 접두어 필요
   - Native User의 경우: 직접 사용자명 사용

---

### 4. OCI_AUTH_TOKEN

**값 예시:**
```
Gt<)S2N6kA}X4[m8Vp0r
```

**생성 방법:**
1. OCI Console 우측 상단 프로필 아이콘 클릭
2. **User Settings** 선택
3. 좌측 메뉴에서 **Auth Tokens** 클릭
4. **Generate Token** 버튼 클릭
5. Description 입력 (예: `github-actions-deployment`)
6. **Generate Token** 클릭
7. 생성된 토큰 즉시 복사 (다시 볼 수 없음!)

⚠️ **중요:** 생성 즉시 복사해야 하며, 다시 확인할 수 없습니다.

---

### 5. OCI_USER_OCID

**값 예시:**
```
ocid1.user.oc1..aaaaaaaabbbbbbbccccccddddddeeeeeefffffff
```

**찾는 방법:**
1. OCI Console 우측 상단 프로필 아이콘 클릭
2. **User Settings** 선택
3. **User Information** 섹션에서 OCID 확인
4. **Copy** 버튼으로 복사

---

### 6. OCI_TENANCY_OCID

**값 예시:**
```
ocid1.tenancy.oc1..aaaaaaaabbbbbbbccccccddddddeeeeeefffffff
```

**찾는 방법:**
1. OCI Console 우측 상단 프로필 아이콘 클릭
2. **Tenancy: <이름>** 클릭
3. **Tenancy Information** 섹션에서 OCID 확인
4. **Copy** 버튼으로 복사

---

### 7. OCI_FINGERPRINT

**값 예시:**
```
aa:bb:cc:dd:ee:ff:11:22:33:44:55:66:77:88:99:00
```

**찾는 방법:**
1. 로컬에서 API 키 페어 생성 (아직 안 했다면):
   ```bash
   mkdir -p ~/.oci
   openssl genrsa -out ~/.oci/oci_api_key.pem 2048
   openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
   ```

2. Public Key를 OCI에 등록:
   - OCI Console 우측 상단 프로필 > **User Settings**
   - **API Keys** > **Add API Key**
   - Public Key 붙여넣기 또는 파일 업로드
   - **Add** 클릭

3. Fingerprint 복사:
   - 등록 완료 후 표시되는 Fingerprint 값 복사
   - 또는 **API Keys** 목록에서 확인

---

### 8. OCI_API_PRIVATE_KEY

**값 예시:**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz...
...
...
-----END RSA PRIVATE KEY-----
```

**설정 방법:**
1. 위에서 생성한 `~/.oci/oci_api_key.pem` 파일 열기:
   ```bash
   cat ~/.oci/oci_api_key.pem
   ```

2. **전체 내용**을 복사 (BEGIN/END 포함)
3. GitHub Secret에 붙여넣기

⚠️ **중요:** 
- 전체 키를 포함해야 함 (BEGIN, END 라인 포함)
- 개행 문자도 그대로 유지
- 절대 공개하지 말 것

---

### 9. OCI_INSTANCE_IP

**값 예시:**
```
123.456.789.012
```

**찾는 방법:**
1. OCI Console에서 **Compute** > **Instances** 이동
2. 배포할 인스턴스 선택
3. **Instance Information**에서 Public IP Address 확인
4. IP 주소만 복사 (http:// 등 제외)

---

### 10. OCI_SSH_PRIVATE_KEY

**값 예시:**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAzyxw1234567890abcdefghijklmnopqrstuv...
...
...
-----END RSA PRIVATE KEY-----
```

**설정 방법:**
1. Compute Instance 생성 시 사용한 SSH Private Key 열기:
   ```bash
   cat ~/.ssh/oci_instance
   ```

2. **전체 내용**을 복사 (BEGIN/END 포함)
3. GitHub Secret에 붙여넣기

⚠️ **중요:** 
- OCI_API_PRIVATE_KEY와 다른 키임
- Instance 접속용 SSH 키
- 절대 공개하지 말 것

---

### 11. DISCORD_TOKEN

**값 예시:**
```
MTIzNDU2Nzg5MDEyMzQ1Njc4.GaBcDe.FgHiJkLmNoPqRsTuVwXyZ1234567890abcd
```

**찾는 방법:**
1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. 애플리케이션 선택
3. **Bot** 섹션 이동
4. **TOKEN** 섹션에서 **Copy** 클릭 또는 **Reset Token**으로 새로 생성

⚠️ **중요:** 토큰이 노출되면 즉시 재생성해야 합니다.

---

### 12. GUILD_ID

**값 예시:**
```
1234567890123456789
```

**찾는 방법:**
1. Discord 앱에서 **User Settings** > **Advanced** > **Developer Mode** 활성화
2. Discord 서버 아이콘 우클릭
3. **Copy Server ID** 선택

---

### 13. SUPABASE_URL

**값 예시:**
```
https://abcdefghijklmnop.supabase.co
```

**찾는 방법:**
1. [Supabase Dashboard](https://app.supabase.com/) 접속
2. 프로젝트 선택
3. **Settings** > **API** 이동
4. **Project URL** 복사

---

### 14. SUPABASE_ANON_KEY

**값 예시:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMjM0NTY3OCwiZXhwIjoxOTI3OTIxNjc4fQ.aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdef
```

**찾는 방법:**
1. [Supabase Dashboard](https://app.supabase.com/) 접속
2. 프로젝트 선택
3. **Settings** > **API** 이동
4. **Project API keys** 섹션에서 `anon` `public` 키 복사

---

### 15. DISCORD_WEBHOOK_URL (선택사항)

**값 예시:**
```
https://discord.com/api/webhooks/1234567890123456789/aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
```

**설정 방법:**
1. Discord 서버의 알림을 받을 채널 선택
2. 채널 설정 (톱니바퀴) > **Integrations** > **Webhooks**
3. **New Webhook** 클릭
4. 이름 설정 및 **Copy Webhook URL**

---

## 설정 확인

모든 Secrets 설정 후:

1. GitHub 저장소에서 **Settings** > **Secrets and variables** > **Actions** 이동
2. 총 14개 (또는 15개) Secrets가 표시되는지 확인
3. Secret 이름의 철자가 정확한지 확인

**체크리스트:**

- [ ] OCI_REGISTRY
- [ ] OCI_NAMESPACE
- [ ] OCI_USERNAME
- [ ] OCI_AUTH_TOKEN
- [ ] OCI_USER_OCID
- [ ] OCI_TENANCY_OCID
- [ ] OCI_FINGERPRINT
- [ ] OCI_API_PRIVATE_KEY
- [ ] OCI_INSTANCE_IP
- [ ] OCI_SSH_PRIVATE_KEY
- [ ] DISCORD_TOKEN
- [ ] GUILD_ID
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] DISCORD_WEBHOOK_URL (선택)

---

## 배포 테스트

Secrets 설정 완료 후:

1. 작은 변경사항 커밋:
   ```bash
   git commit --allow-empty -m "test: trigger deployment"
   git push origin main
   ```

2. GitHub Actions 탭에서 진행 상황 확인
3. 배포 실패 시 로그를 확인하여 어떤 Secret이 문제인지 파악

---

## 보안 주의사항

⚠️ **중요 보안 규칙:**

1. **절대 코드에 직접 입력하지 마세요**
2. **GitHub Secrets는 암호화되어 저장됩니다**
3. **한 번 저장하면 값을 다시 볼 수 없습니다** (업데이트만 가능)
4. **Private Key는 절대 공유하지 마세요**
5. **토큰이 노출되면 즉시 재생성하세요**
6. **정기적으로 Auth Token을 갱신하세요**

---

## 문제 해결

### Secret 값이 잘못 입력된 경우

1. 해당 Secret 선택
2. **Update secret** 버튼 클릭
3. 올바른 값 입력
4. **Update secret** 확인

### Private Key 형식 오류

Private Key는 다음 형식이어야 합니다:

```
-----BEGIN RSA PRIVATE KEY-----
MII...
...
...
-----END RSA PRIVATE KEY-----
```

- BEGIN/END 라인 포함
- 개행 문자 유지
- 추가 공백 없음

---

## 추가 도움말

더 자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.


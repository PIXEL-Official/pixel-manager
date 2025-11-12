# 빠른 시작 가이드

Oracle Cloud에 Discord Bot을 배포하기 위한 빠른 시작 가이드입니다.

## 📋 사전 준비 (10분)

### 1. OCI 계정 및 리소스

- [ ] Oracle Cloud 계정 생성 (무료 티어 가능)
- [ ] Compute Instance 생성 (Ubuntu 22.04)
- [ ] Public IP 주소 확인
- [ ] SSH 키 페어 생성 및 저장

### 2. 로컬 환경

- [ ] Docker 설치
- [ ] Git 설치
- [ ] Node.js 20+ 및 pnpm 설치

---

## 🚀 배포 단계 (30분)

### Step 1: 저장소 클론

```bash
git clone <your-repository-url>
cd pixel-manager
```

### Step 2: 의존성 설치

```bash
pnpm install
```

### Step 3: 로컬 테스트

```bash
# 환경 변수 설정
cp docs/env.example .env
# .env 파일을 실제 값으로 수정

# 테스트 실행
pnpm test:run

# Docker 로컬 테스트
./scripts/local-deploy-test.sh
```

### Step 4: OCI 설정

#### 4.1 Compute Instance에 Docker 설치

```bash
# SSH로 인스턴스 접속
ssh -i ~/.ssh/oci_instance ubuntu@<INSTANCE_IP>

# Docker 설치
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# 재로그인
exit
ssh -i ~/.ssh/oci_instance ubuntu@<INSTANCE_IP>
```

#### 4.2 OCI API 키 생성

```bash
# 로컬에서 실행
mkdir -p ~/.oci
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
```

OCI Console에서 Public Key 등록:
1. 프로필 > User Settings > API Keys > Add API Key
2. `oci_api_key_public.pem` 내용 붙여넣기
3. Fingerprint 복사

#### 4.3 Auth Token 생성

1. OCI Console > 프로필 > User Settings > Auth Tokens
2. Generate Token
3. 토큰 즉시 복사 (다시 볼 수 없음)

### Step 5: GitHub Secrets 설정

GitHub 저장소에서 Settings > Secrets and variables > Actions

**필수 14개 Secrets 추가:**

#### OCI 인증
- `OCI_REGISTRY`: `icn.ocir.io` (서울 리전)
- `OCI_NAMESPACE`: Object Storage 네임스페이스
- `OCI_USERNAME`: `<namespace>/<username>`
- `OCI_AUTH_TOKEN`: 생성한 Auth Token
- `OCI_USER_OCID`: User OCID
- `OCI_TENANCY_OCID`: Tenancy OCID
- `OCI_FINGERPRINT`: API Key Fingerprint

#### OCI 인프라
- `OCI_API_PRIVATE_KEY`: `cat ~/.oci/oci_api_key.pem` 전체 내용
- `OCI_INSTANCE_IP`: Compute Instance Public IP
- `OCI_SSH_PRIVATE_KEY`: `cat ~/.ssh/oci_instance` 전체 내용

#### 애플리케이션
- `DISCORD_TOKEN`: Discord Bot 토큰
- `GUILD_ID`: Discord 서버 ID
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase Anon Key

**선택사항:**
- `DISCORD_WEBHOOK_URL`: 배포 알림용 Webhook

> 📚 자세한 설명: [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)

### Step 6: 배포 실행

```bash
# main 브랜치에 푸시
git add .
git commit -m "chore: setup deployment"
git push origin main
```

GitHub Actions가 자동으로 실행됩니다!

### Step 7: 배포 확인

#### GitHub에서 확인
1. GitHub > Actions 탭
2. 워크플로우 진행 상황 확인
3. 각 단계별 로그 확인

#### 서버에서 확인
```bash
ssh -i ~/.ssh/oci_instance ubuntu@<INSTANCE_IP>

# 컨테이너 상태 확인
docker ps | grep pixel-manager

# 로그 확인
docker logs -f pixel-manager
```

#### Discord에서 확인
- Discord 서버에서 봇이 온라인 상태인지 확인
- 슬래시 커맨드가 작동하는지 테스트

---

## ✅ 배포 완료 체크리스트

- [ ] GitHub Actions 워크플로우 성공
- [ ] 컨테이너가 정상 실행 중
- [ ] Discord에서 봇이 온라인
- [ ] 슬래시 커맨드 작동 확인
- [ ] Supabase 연결 정상
- [ ] 로그에 에러 없음

---

## 🔄 일상적인 배포 워크플로우

코드 수정 후:

```bash
# 1. 로컬에서 테스트
pnpm test:run

# 2. 커밋 및 푸시
git add .
git commit -m "feat: add new feature"
git push origin main

# 3. GitHub Actions 자동 배포 확인
```

그게 전부입니다! 🎉

---

## 📊 모니터링

### 로그 확인
```bash
ssh ubuntu@<INSTANCE_IP>
docker logs -f pixel-manager
```

### 리소스 사용량 확인
```bash
docker stats pixel-manager
```

### 컨테이너 재시작
```bash
docker restart pixel-manager
```

---

## 🐛 문제 해결

### 배포 실패 시

1. **GitHub Actions 로그 확인**
   - 어떤 단계에서 실패했는지 확인
   - 에러 메시지 읽기

2. **Secrets 확인**
   - 모든 Secrets가 올바르게 설정되었는지
   - 특히 Private Key의 형식 확인

3. **서버 상태 확인**
   ```bash
   ssh ubuntu@<INSTANCE_IP>
   docker ps -a
   docker logs pixel-manager
   ```

### 봇이 오프라인인 경우

```bash
# 서버 접속
ssh ubuntu@<INSTANCE_IP>

# 로그 확인
docker logs pixel-manager

# 컨테이너 재시작
docker restart pixel-manager
```

### 일반적인 문제들

| 문제 | 해결책 |
|-----|--------|
| Docker 로그인 실패 | Auth Token 재확인 |
| SSH 연결 실패 | SSH Private Key 및 IP 확인 |
| 이미지 풀 실패 | OCIR 레지스트리 URL 확인 |
| 컨테이너 즉시 종료 | Discord 토큰 확인 |

> 📚 자세한 문제 해결: [DEPLOYMENT.md](./DEPLOYMENT.md#문제-해결)

---

## 📚 추가 문서

- [상세 배포 가이드](./DEPLOYMENT.md)
- [GitHub Secrets 설정](./GITHUB_SECRETS_SETUP.md)
- [스크립트 사용법](../scripts/README.md)
- [프로젝트 README](../README.md)

---

## 💡 팁

### 비용 절약
- Oracle Cloud의 Always Free 티어 활용
- VM.Standard.E2.1.Micro는 영구 무료
- 사용하지 않을 때 인스턴스 중지

### 보안
- Private Key는 절대 공개하지 않기
- Auth Token 정기적으로 갱신
- SSH 포트만 열어두기
- 환경 변수로 민감 정보 관리

### 성능
- 로그 정기적으로 확인
- 디스크 공간 모니터링
- 불필요한 Docker 이미지 정리

---

## 🆘 도움이 필요하신가요?

- GitHub Issues에 질문하기
- [DEPLOYMENT.md](./DEPLOYMENT.md) 전체 문서 읽기
- Discord 봇 로그 확인하기

**축하합니다! 배포가 완료되었습니다! 🎉**


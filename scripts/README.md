# 배포 스크립트 가이드

이 디렉토리에는 Oracle Cloud 배포를 위한 유틸리티 스크립트들이 포함되어 있습니다.

## 스크립트 목록

### 1. check-deployment.sh

배포 준비 상태를 확인하는 스크립트입니다.

**기능:**
- Docker 설치 확인
- 필수 파일 존재 확인
- 환경 변수 설정 확인
- Docker 빌드 테스트
- GitHub 원격 저장소 설정 확인

**사용법:**

```bash
./scripts/check-deployment.sh
```

**출력 예시:**

```
======================================
Oracle Cloud Deployment Check
======================================

1. Checking required commands...
✓ docker is installed
✓ git is installed
✓ pnpm is installed

2. Checking required files...
✓ Dockerfile exists
✓ .github/workflows/deploy.yml exists
✓ package.json exists
✓ pnpm-lock.yaml exists

3. Checking environment variables...
✓ DISCORD_TOKEN is set
✓ GUILD_ID is set
✓ SUPABASE_URL is set
✓ SUPABASE_ANON_KEY is set

4. Testing Docker build...
✓ Docker build successful

5. Checking GitHub repository...
✓ GitHub remote configured

======================================
Summary
======================================
Passed: 14
Failed: 0

✓ All checks passed! Ready for deployment.
```

---

### 2. local-deploy-test.sh

로컬 환경에서 Docker 컨테이너를 빌드하고 실행하여 배포를 테스트하는 스크립트입니다.

**기능:**
- `.env` 파일 자동 생성 (없는 경우)
- Docker 이미지 빌드
- 기존 컨테이너 정리
- 새 컨테이너 실행
- 로그 확인

**사용법:**

```bash
# .env 파일이 있는지 확인 (없으면 생성됨)
./scripts/local-deploy-test.sh
```

**필수 준비사항:**
- `.env` 파일에 실제 환경 변수 설정
- Docker가 실행 중이어야 함

**출력 예시:**

```
======================================
Local Deployment Test
======================================

1. Building Docker image...
✓ Build completed

2. Stopping existing container (if any)...
✓ Cleanup completed

3. Starting container...
✓ Container started

4. Waiting for bot to initialize (10 seconds)...

5. Checking container status...
CONTAINER ID   IMAGE                  COMMAND        CREATED         STATUS         PORTS     NAMES
abc123def456   pixel-manager:local    "pnpm start"   5 seconds ago   Up 4 seconds             pixel-manager-test

6. Showing recent logs...
[INFO] Bot is starting...
[INFO] Connected to Discord
[INFO] Bot is ready!

======================================
Test completed successfully!
======================================

Commands:
  View logs:     docker logs -f pixel-manager-test
  Stop:          docker stop pixel-manager-test
  Remove:        docker rm pixel-manager-test
  Shell access:  docker exec -it pixel-manager-test sh
```

**유용한 후속 명령어:**

```bash
# 실시간 로그 보기
docker logs -f pixel-manager-test

# 컨테이너 중지
docker stop pixel-manager-test

# 컨테이너 제거
docker rm pixel-manager-test

# 컨테이너 내부 쉘 접속
docker exec -it pixel-manager-test sh

# 컨테이너 상태 확인
docker ps | grep pixel-manager-test

# 리소스 사용량 확인
docker stats pixel-manager-test
```

---

## 문제 해결

### Docker 권한 오류

**증상:**
```
permission denied while trying to connect to the Docker daemon socket
```

**해결책:**
```bash
# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 재로그인 또는
newgrp docker
```

---

### .env 파일 없음

**증상:**
```
Warning: .env file not found
```

**해결책:**
1. 자동 생성된 `.env` 파일 편집
2. 또는 `docs/env.example` 파일을 복사:
   ```bash
   cp docs/env.example .env
   ```
3. 실제 값으로 수정

---

### 컨테이너가 즉시 종료됨

**증상:**
컨테이너가 시작되자마자 중료됨

**해결책:**
```bash
# 로그 확인
docker logs pixel-manager-test

# 일반적인 원인:
# 1. 잘못된 환경 변수
# 2. Discord 토큰 오류
# 3. Supabase 연결 실패
```

---

### 빌드 실패

**증상:**
Docker 이미지 빌드 중 오류 발생

**해결책:**
```bash
# 캐시 없이 다시 빌드
docker build --no-cache -t pixel-manager:local .

# 빌드 로그 자세히 보기
docker build -t pixel-manager:local . --progress=plain
```

---

## 배포 전 체크리스트

로컬 테스트를 완료한 후 실제 배포 전에 확인할 사항:

- [ ] `check-deployment.sh` 모든 항목 통과
- [ ] `local-deploy-test.sh` 정상 작동
- [ ] Discord 봇이 정상적으로 응답
- [ ] Supabase 데이터베이스 연결 확인
- [ ] 모든 명령어가 작동하는지 확인
- [ ] GitHub Secrets 모두 설정 완료
- [ ] OCI Compute Instance 준비 완료
- [ ] OCI Container Registry 설정 완료

---

## 추가 리소스

- [배포 가이드](../docs/DEPLOYMENT.md)
- [GitHub Secrets 설정 가이드](../docs/GITHUB_SECRETS_SETUP.md)
- [프로젝트 README](../README.md)

---

## 지원

문제가 발생하면:
1. 로그를 확인하세요 (`docker logs`)
2. GitHub Issues에 문의하세요
3. [DEPLOYMENT.md](../docs/DEPLOYMENT.md)의 문제 해결 섹션을 참조하세요


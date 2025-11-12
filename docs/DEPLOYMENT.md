# Oracle Cloud 배포 가이드

이 문서는 GitHub Actions를 사용하여 Discord Bot을 Oracle Cloud Infrastructure (OCI)에 배포하는 방법을 설명합니다.

## 목차

1. [사전 준비](#사전-준비)
2. [OCI 설정](#oci-설정)
3. [GitHub Secrets 설정](#github-secrets-설정)
4. [배포 프로세스](#배포-프로세스)
5. [문제 해결](#문제-해결)

## 사전 준비

### 필요한 것들

- Oracle Cloud Infrastructure 계정
- GitHub 계정
- Compute Instance (VM) 또는 Container Instances
- Oracle Container Registry (OCIR) 접근 권한

## OCI 설정

### 1. Compute Instance 생성

1. OCI Console에 로그인
2. **Compute** > **Instances** > **Create Instance**
3. 권장 사양:
   - Shape: VM.Standard.E2.1.Micro (Always Free 티어 가능)
   - Image: Ubuntu 22.04
   - VCN: 기본 VCN 사용 또는 새로 생성
   - Public IP: 할당 필요

4. SSH 키 페어 생성 및 저장
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/oci_instance
   ```

5. 인스턴스 생성 완료 후 Public IP 주소 확인

### 2. Compute Instance에 Docker 설치

SSH로 인스턴스에 접속:
```bash
ssh -i ~/.ssh/oci_instance ubuntu@<INSTANCE_IP>
```

Docker 설치:
```bash
# 패키지 업데이트
sudo apt-get update

# Docker 설치
sudo apt-get install -y docker.io

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 재로그인 (또는 newgrp docker 실행)
```

### 3. Oracle Container Registry (OCIR) 설정

1. OCI Console에서 **Developer Services** > **Container Registry**
2. Repository 생성:
   - Name: `pixel-manager`
   - Access: Private

3. Auth Token 생성:
   - OCI Console 우측 상단 프로필 아이콘 클릭
   - **User Settings** > **Auth Tokens** > **Generate Token**
   - 토큰 이름 입력 (예: `github-actions`)
   - 생성된 토큰 복사 및 안전하게 보관 (다시 볼 수 없음)

### 4. OCI API Keys 설정

API 키 생성:
```bash
# 로컬에서 실행
mkdir -p ~/.oci
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
```

Public Key를 OCI에 등록:
1. OCI Console 우측 상단 프로필 아이콘 클릭
2. **User Settings** > **API Keys** > **Add API Key**
3. `oci_api_key_public.pem` 내용 붙여넣기
4. Fingerprint 값 복사 및 저장

### 5. 보안 규칙 설정 (선택사항)

Discord Bot은 아웃바운드 연결만 사용하므로 인바운드 규칙은 SSH(22)만 필요합니다.

## GitHub Secrets 설정

GitHub 저장소의 **Settings** > **Secrets and variables** > **Actions**에서 다음 secrets를 추가합니다:

### OCI 관련 Secrets

| Secret Name | 설명 | 예시 |
|------------|------|-----|
| `OCI_REGISTRY` | OCIR 레지스트리 URL | `icn.ocir.io` (서울 리전) |
| `OCI_NAMESPACE` | OCI Tenancy Namespace | Object Storage 네임스페이스 참고 |
| `OCI_USERNAME` | OCIR 로그인 사용자명 | `<namespace>/<username>` |
| `OCI_AUTH_TOKEN` | 생성한 Auth Token | `******************` |
| `OCI_USER_OCID` | User OCID | `ocid1.user.oc1..aaaaaa...` |
| `OCI_TENANCY_OCID` | Tenancy OCID | `ocid1.tenancy.oc1..aaaaaa...` |
| `OCI_FINGERPRINT` | API Key Fingerprint | `aa:bb:cc:dd:ee:...` |
| `OCI_API_PRIVATE_KEY` | API Private Key 전체 내용 | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `OCI_INSTANCE_IP` | Compute Instance의 Public IP | `123.456.789.012` |
| `OCI_SSH_PRIVATE_KEY` | Instance SSH Private Key | `-----BEGIN RSA PRIVATE KEY-----\n...` |

### 애플리케이션 Secrets

| Secret Name | 설명 |
|------------|------|
| `DISCORD_TOKEN` | Discord Bot 토큰 |
| `GUILD_ID` | Discord 서버 ID |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Key |

### 알림 설정 (선택사항)

| Secret Name | 설명 |
|------------|------|
| `DISCORD_WEBHOOK_URL` | 배포 알림을 받을 Discord Webhook URL |

## OCID 및 Namespace 찾기

### User OCID
1. OCI Console 우측 상단 프로필 아이콘 클릭
2. **User Settings**
3. **User Information** 섹션에서 OCID 복사

### Tenancy OCID
1. OCI Console 우측 상단 프로필 아이콘 클릭
2. **Tenancy: <tenancy-name>** 클릭
3. **Tenancy Information** 섹션에서 OCID 복사

### Namespace
1. OCI Console에서 **Developer Services** > **Container Registry**
2. 페이지 상단에 표시된 Namespace 확인

### Registry URL (리전별)

- **서울 (ap-seoul-1)**: `icn.ocir.io`
- **도쿄 (ap-tokyo-1)**: `nrt.ocir.io`
- **춘천 (ap-chuncheon-1)**: `yny.ocir.io`
- **미국 애쉬번 (us-ashburn-1)**: `iad.ocir.io`

## 배포 프로세스

### 자동 배포

`main` 브랜치에 푸시하면 자동으로 배포가 진행됩니다:

```bash
git add .
git commit -m "Deploy changes"
git push origin main
```

### 수동 배포

GitHub Actions 페이지에서:
1. **Actions** 탭 클릭
2. **Deploy to Oracle Cloud** 워크플로우 선택
3. **Run workflow** 버튼 클릭

### 배포 단계

1. **Test**: 모든 테스트 실행
2. **Build and Push**: Docker 이미지 빌드 및 OCIR에 푸시
3. **Deploy**: Compute Instance에 배포
4. **Notify**: Discord로 배포 결과 알림 (설정한 경우)

## 로컬에서 테스트

배포 전에 로컬에서 Docker 이미지를 테스트할 수 있습니다:

```bash
# Docker 이미지 빌드
docker build -t pixel-manager:local .

# 로컬에서 실행
docker run -d \
  --name pixel-manager \
  -e DISCORD_TOKEN="your_token" \
  -e GUILD_ID="your_guild_id" \
  -e SUPABASE_URL="your_supabase_url" \
  -e SUPABASE_ANON_KEY="your_supabase_key" \
  pixel-manager:local

# 로그 확인
docker logs -f pixel-manager

# 중지 및 제거
docker stop pixel-manager
docker rm pixel-manager
```

## 배포 후 확인

### 1. GitHub Actions 로그 확인

GitHub에서 **Actions** 탭을 클릭하여 배포 상태를 확인합니다.

### 2. 인스턴스에서 직접 확인

```bash
ssh -i ~/.ssh/oci_instance ubuntu@<INSTANCE_IP>

# 컨테이너 상태 확인
docker ps | grep pixel-manager

# 로그 확인
docker logs -f pixel-manager

# 리소스 사용량 확인
docker stats pixel-manager
```

### 3. Discord에서 확인

Discord 서버에서 봇이 온라인 상태인지 확인합니다.

## 문제 해결

### 1. Docker 로그인 실패

**증상**: `Error response from daemon: login attempt failed`

**해결책**:
- Auth Token이 올바른지 확인
- Username 형식 확인: `<namespace>/<username>`
- OCIR URL이 올바른 리전인지 확인

### 2. 이미지 풀 실패

**증상**: `Error: manifest unknown`

**해결책**:
- OCIR에 이미지가 정상적으로 푸시되었는지 확인
- 이미지 이름과 태그가 올바른지 확인
- Repository가 Private이라면 docker login이 정상적으로 되었는지 확인

### 3. SSH 연결 실패

**증상**: `Permission denied (publickey)`

**해결책**:
- SSH Private Key가 GitHub Secrets에 올바르게 저장되었는지 확인
- Instance IP가 올바른지 확인
- Security List에서 SSH(22) 포트가 열려있는지 확인

### 4. 컨테이너 시작 실패

**증상**: 컨테이너가 시작되지 않거나 즉시 종료됨

**해결책**:
```bash
# 상세 로그 확인
docker logs pixel-manager

# 환경 변수 확인
docker inspect pixel-manager | grep -A 10 Env

# 수동으로 실행해보기
docker run -it --rm \
  -e DISCORD_TOKEN="your_token" \
  -e GUILD_ID="your_guild_id" \
  -e SUPABASE_URL="your_supabase_url" \
  -e SUPABASE_ANON_KEY="your_supabase_key" \
  <registry>/<namespace>/pixel-manager:latest
```

### 5. 메모리 부족

**증상**: 컨테이너가 OOMKilled 상태

**해결책**:
- Compute Instance의 메모리를 확인
- 필요시 Shape를 업그레이드
- Docker에 메모리 제한 설정:
  ```bash
  docker run -d --memory="512m" ...
  ```

## 모니터링 및 유지보수

### 로그 모니터링

```bash
# 실시간 로그 보기
docker logs -f --tail 100 pixel-manager

# 특정 시간대 로그
docker logs --since 2024-01-01T00:00:00 pixel-manager
```

### 자동 재시작 설정

컨테이너는 이미 `--restart unless-stopped` 옵션으로 실행되므로, 인스턴스 재부팅 시에도 자동으로 시작됩니다.

### 디스크 공간 관리

```bash
# 사용하지 않는 이미지 정리
docker image prune -af

# 디스크 사용량 확인
df -h
docker system df
```

### 업데이트 및 롤백

업데이트는 자동으로 진행되며, 필요시 이전 버전으로 롤백할 수 있습니다:

```bash
# 이전 이미지로 롤백
docker stop pixel-manager
docker rm pixel-manager
docker run -d \
  --name pixel-manager \
  --restart unless-stopped \
  -e DISCORD_TOKEN="..." \
  ... \
  <registry>/<namespace>/pixel-manager:<previous-tag>
```

## 보안 권장사항

1. **SSH Key 관리**: Private Key는 절대 공개하지 마세요
2. **Auth Token**: 정기적으로 토큰을 갱신하세요
3. **Security List**: 필요한 포트만 열어두세요
4. **이미지 스캔**: 정기적으로 보안 취약점을 확인하세요
5. **환경 변수**: 민감한 정보는 항상 환경 변수로 관리하세요

## 비용 최적화

1. **Always Free 티어 활용**: VM.Standard.E2.1.Micro는 무료입니다
2. **사용하지 않는 리소스 삭제**: 불필요한 이미지나 컨테이너를 삭제하세요
3. **Idle 인스턴스 관리**: 장기간 사용하지 않는다면 인스턴스를 중지하세요

## 추가 리소스

- [Oracle Cloud Infrastructure 문서](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [Oracle Container Registry 가이드](https://docs.oracle.com/en-us/iaas/Content/Registry/home.htm)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Discord.js 가이드](https://discordjs.guide/)

## 지원

문제가 발생하면 GitHub Issues에 문의해주세요.


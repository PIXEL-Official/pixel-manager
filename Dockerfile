# Node.js 20 사용
FROM node:20-alpine

# pnpm 설치
RUN npm install -g pnpm@8.15.0

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 pnpm-lock.yaml 복사
COPY package.json pnpm-lock.yaml* ./

# 의존성 설치 (프로덕션 의존성만)
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN pnpm build

# 프로덕션 환경에서 실행
CMD ["pnpm", "start"]


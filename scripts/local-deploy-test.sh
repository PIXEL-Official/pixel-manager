#!/bin/bash

# 로컬에서 배포 환경 테스트 스크립트

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================"
echo "Local Deployment Test"
echo "======================================${NC}"
echo ""

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from example..."
    
    cat > .env << 'EOF'
DISCORD_TOKEN=your_discord_token_here
GUILD_ID=your_guild_id_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOF
    
    echo -e "${YELLOW}Please edit .env file with your credentials${NC}"
    exit 1
fi

# .env 파일 로드
source .env

echo "1. Building Docker image..."
docker build -t pixel-manager:local .
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

echo "2. Stopping existing container (if any)..."
docker stop pixel-manager-test 2>/dev/null || true
docker rm pixel-manager-test 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo ""

echo "3. Starting container..."
docker run -d \
  --name pixel-manager-test \
  -e DISCORD_TOKEN="$DISCORD_TOKEN" \
  -e GUILD_ID="$GUILD_ID" \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  pixel-manager:local

echo -e "${GREEN}✓ Container started${NC}"
echo ""

echo "4. Waiting for bot to initialize (10 seconds)..."
sleep 10
echo ""

echo "5. Checking container status..."
docker ps | grep pixel-manager-test
echo ""

echo "6. Showing recent logs..."
docker logs --tail 20 pixel-manager-test
echo ""

echo -e "${BLUE}======================================"
echo "Test completed successfully!"
echo "======================================${NC}"
echo ""
echo "Commands:"
echo "  View logs:     docker logs -f pixel-manager-test"
echo "  Stop:          docker stop pixel-manager-test"
echo "  Remove:        docker rm pixel-manager-test"
echo "  Shell access:  docker exec -it pixel-manager-test sh"
echo ""


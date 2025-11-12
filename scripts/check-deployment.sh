#!/bin/bash

# Oracle Cloud 배포 준비 상태 체크 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Oracle Cloud Deployment Check"
echo "======================================"
echo ""

# 체크 카운터
CHECKS_PASSED=0
CHECKS_FAILED=0

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        ((CHECKS_FAILED++))
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $1 not found"
        ((CHECKS_FAILED++))
    fi
}

check_env_var() {
    if [ -n "${!1}" ]; then
        echo -e "${GREEN}✓${NC} $1 is set"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} $1 is not set (required for GitHub Secrets)"
        ((CHECKS_FAILED++))
    fi
}

echo "1. Checking required commands..."
check_command "docker"
check_command "git"
check_command "pnpm"
echo ""

echo "2. Checking required files..."
check_file "Dockerfile"
check_file ".github/workflows/deploy.yml"
check_file "package.json"
check_file "pnpm-lock.yaml"
echo ""

echo "3. Checking environment variables..."
check_env_var "DISCORD_TOKEN"
check_env_var "GUILD_ID"
check_env_var "SUPABASE_URL"
check_env_var "SUPABASE_ANON_KEY"
echo ""

echo "4. Testing Docker build..."
if docker build -t pixel-manager-test . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker build successful"
    ((CHECKS_PASSED++))
    docker rmi pixel-manager-test > /dev/null 2>&1
else
    echo -e "${RED}✗${NC} Docker build failed"
    ((CHECKS_FAILED++))
fi
echo ""

echo "5. Checking GitHub repository..."
if git remote -v | grep -q "github.com"; then
    echo -e "${GREEN}✓${NC} GitHub remote configured"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC} GitHub remote not found"
    ((CHECKS_FAILED++))
fi
echo ""

echo "======================================"
echo "Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some checks failed. Please review the issues above.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Install missing dependencies"
    echo "2. Set up environment variables"
    echo "3. Configure GitHub Secrets (see docs/DEPLOYMENT.md)"
    echo "4. Push to main branch to trigger deployment"
    exit 1
fi


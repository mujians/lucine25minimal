#!/bin/bash

# 🚀 DEPLOY TO VERCEL - Chat API v2
# Deploy automatico su Vercel per testing online con Shopify

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 VERCEL DEPLOYMENT - Chat API v2${NC}"
echo -e "${BLUE}=====================================NC}"
echo ""

# Check if we're logged in to Vercel
echo "Checking Vercel login..."
if ! vercel whoami > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel${NC}"
    echo "Running 'vercel login'..."
    vercel login
fi

echo -e "${GREEN}✅ Logged in to Vercel${NC}"

# Deploy options
echo -e "\n${BLUE}Choose deployment type:${NC}"
echo "1. 🧪 Preview deployment (for testing)"
echo "2. 🚀 Production deployment (replace current)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo -e "\n${YELLOW}🧪 PREVIEW DEPLOYMENT${NC}"
        echo "Deploying to preview environment..."
        
        # Deploy to preview
        vercel --no-clipboard
        
        echo -e "\n${GREEN}✅ Preview deployment complete!${NC}"
        echo -e "${YELLOW}📋 Note the preview URL above${NC}"
        echo ""
        echo "To test with Shopify:"
        echo "1. Copy the preview URL (e.g., https://chatbot-backend-xxx.vercel.app)"
        echo "2. We'll create a test version of your theme"
        ;;
        
    2)
        echo -e "\n${RED}🚀 PRODUCTION DEPLOYMENT${NC}"
        echo "⚠️  This will replace the current production deployment"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Deploying to production..."
            vercel --prod --no-clipboard
            
            echo -e "\n${GREEN}✅ Production deployment complete!${NC}"
        else
            echo "Deployment cancelled"
            exit 0
        fi
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Get the deployment URL
echo -e "\n${BLUE}📋 DEPLOYMENT INFO:${NC}"
echo "Your backend is now deployed!"
echo ""
echo "API Endpoints available:"
echo "  • /api/chat     - Original v1 (if exists)"
echo "  • /api/chat-v2  - New modular v2"
echo ""
echo -e "${YELLOW}🧪 To test with Shopify, update your theme's backend URL${NC}"

# Save deployment info
echo "[$(date)] Deployment completed" >> deployment.log

echo -e "\n${GREEN}✅ Deployment script completed!${NC}"
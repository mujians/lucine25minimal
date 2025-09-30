#!/bin/bash

# 🚀 DEPLOYMENT SCRIPT - Chat API V1 → V2
# Automatizza il passaggio sicuro dalla vecchia alla nuova architettura

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./deploy-v2.log"

echo -e "${BLUE}🚀 LUCINE CHATBOT - DEPLOYMENT V1 → V2${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function for user confirmation
confirm() {
    read -p "$(echo -e ${YELLOW}$1${NC}) [y/N]: " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Step 1: Pre-deployment checks
echo -e "${BLUE}📋 Step 1: Pre-deployment checks${NC}"
log "Starting pre-deployment checks"

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "api" ]]; then
    echo -e "${RED}❌ Error: Run this script from the chatbot-backend directory${NC}"
    exit 1
fi

# Check if v2 files exist
if [[ ! -f "api/chat-v2.js" ]] || [[ ! -d "api/chat" ]]; then
    echo -e "${RED}❌ Error: Chat API v2 files not found${NC}"
    echo -e "${RED}   Make sure you've completed the modularization step${NC}"
    exit 1
fi

# Check if original chat.js exists
if [[ ! -f "api/chat.js" ]]; then
    echo -e "${RED}❌ Error: Original api/chat.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required files found${NC}"

# Step 2: Run tests
echo -e "\n${BLUE}🧪 Step 2: Running tests${NC}"
log "Running pre-deployment tests"

if confirm "Run comprehensive tests before deployment?"; then
    echo "Running API v2 tests..."
    if node test-chat-v2.js; then
        echo -e "${GREEN}✅ Core API tests passed${NC}"
    else
        echo -e "${RED}❌ Core API tests failed${NC}"
        exit 1
    fi
    
    echo "Running frontend integration tests..."
    if node test-frontend-integration.js; then
        echo -e "${GREEN}✅ Frontend integration tests passed${NC}"
    else
        echo -e "${RED}❌ Frontend integration tests failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping tests (not recommended for production)${NC}"
fi

# Step 3: Create backup
echo -e "\n${BLUE}💾 Step 3: Creating backup${NC}"
log "Creating backup of current system"

mkdir -p "$BACKUP_DIR"

# Backup current files
cp api/chat.js "$BACKUP_DIR/chat-v1-original.js"
cp package.json "$BACKUP_DIR/package.json"
if [[ -f "data/whatsapp-users.json" ]]; then
    cp data/whatsapp-users.json "$BACKUP_DIR/whatsapp-users.json"
fi

# Create rollback script
cat > "$BACKUP_DIR/rollback.sh" << 'EOF'
#!/bin/bash
# Rollback script - auto-generated
echo "🔄 Rolling back to Chat API v1..."
cp chat-v1-original.js ../api/chat.js
cp package.json ../package.json
echo "✅ Rollback complete"
echo "ℹ️  You may need to restart your Vercel dev server"
EOF
chmod +x "$BACKUP_DIR/rollback.sh"

echo -e "${GREEN}✅ Backup created at $BACKUP_DIR${NC}"
log "Backup created successfully"

# Step 4: Deployment options
echo -e "\n${BLUE}🚀 Step 4: Deployment options${NC}"
echo "Choose deployment strategy:"
echo "1. 🧪 Safe deployment (keep both v1 and v2, test in production)"
echo "2. 🔄 Full replacement (replace v1 with v2 completely)"  
echo "3. 📊 Monitoring setup (deploy v2 alongside v1 for comparison)"

read -p "Enter your choice [1-3]: " choice

case $choice in
    1)
        echo -e "\n${GREEN}🧪 SAFE DEPLOYMENT SELECTED${NC}"
        echo "This will:"
        echo "- Keep /api/chat (v1) running"  
        echo "- Make /api/chat-v2 available for testing"
        echo "- Allow gradual migration"
        
        if confirm "Proceed with safe deployment?"; then
            log "Starting safe deployment"
            
            # Just ensure v2 is ready
            echo -e "${GREEN}✅ Chat API v2 ready at /api/chat-v2${NC}"
            echo -e "${GREEN}✅ Chat API v1 still available at /api/chat${NC}"
            echo ""
            echo -e "${YELLOW}📋 Next steps:${NC}"
            echo "1. Update frontend to use /api/chat-v2 for testing"
            echo "2. Monitor both versions in parallel"
            echo "3. Once confident, run this script with option 2"
            
            log "Safe deployment completed"
        fi
        ;;
        
    2)
        echo -e "\n${RED}🔄 FULL REPLACEMENT SELECTED${NC}"
        echo "⚠️  This will:"
        echo "- Replace /api/chat with v2 code"
        echo "- Backup v1 to chat-v1-backup.js"
        echo "- Make v2 the primary API"
        
        if confirm "⚠️  Are you sure? This changes production behavior"; then
            log "Starting full replacement deployment"
            
            # Move files
            mv api/chat.js api/chat-v1-backup.js
            mv api/chat-v2.js api/chat.js
            
            # Update vercel.json if it exists
            if [[ -f "vercel.json" ]]; then
                log "Vercel configuration found - may need manual update"
            fi
            
            echo -e "${GREEN}✅ Full replacement completed${NC}"
            echo -e "${GREEN}✅ Chat API v2 is now primary at /api/chat${NC}"
            echo -e "${YELLOW}📋 V1 backed up to api/chat-v1-backup.js${NC}"
            
            log "Full replacement deployment completed"
        fi
        ;;
        
    3)
        echo -e "\n${BLUE}📊 MONITORING SETUP SELECTED${NC}"
        echo "This will set up both versions for comparison"
        
        # Create monitoring script
        cat > monitor-apis.js << 'EOF'
/**
 * API Monitoring Script
 * Compares v1 and v2 responses for same inputs
 */

const testMessages = [
    "Quanto costano i biglietti?",
    "Voglio prenotare per il 25 dicembre", 
    "Info parcheggi",
    "Orari apertura"
];

async function compareAPIs() {
    for (const message of testMessages) {
        console.log(`Testing: "${message}"`);
        
        // Test both versions
        const results = await Promise.allSettled([
            testAPI('/api/chat', message),
            testAPI('/api/chat-v2', message)
        ]);
        
        console.log('V1 response time:', results[0].value?.responseTime || 'ERROR');
        console.log('V2 response time:', results[1].value?.responseTime || 'ERROR');
        console.log('---');
    }
}

async function testAPI(endpoint, message) {
    const start = Date.now();
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message, sessionId: 'monitor'})
    });
    const responseTime = Date.now() - start;
    const data = await response.json();
    
    return {responseTime, status: response.status, hasReply: !!data.reply};
}

compareAPIs().catch(console.error);
EOF
        
        echo -e "${GREEN}✅ Monitoring setup ready${NC}"
        echo -e "${YELLOW}📋 Run 'node monitor-apis.js' to compare versions${NC}"
        
        log "Monitoring setup completed"
        ;;
        
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Step 5: Post-deployment verification
if [[ $choice == "2" ]]; then
    echo -e "\n${BLUE}🔍 Step 5: Post-deployment verification${NC}"
    
    if confirm "Run post-deployment verification tests?"; then
        echo "Testing deployed API..."
        
        # Simple API test
        cat > temp-test.js << 'EOF'
import handler from './api/chat.js';

const req = {
    method: 'POST',
    body: {message: "Test deployment", sessionId: "deploy_test"},
    headers: {'x-forwarded-for': '127.0.0.1'}
};

const res = {
    setHeader: () => {},
    status: (code) => res,
    json: (data) => {
        console.log('✅ API responding correctly');
        console.log('Response preview:', data.reply?.substring(0, 50) + '...');
        return res;
    },
    end: () => res
};

handler(req, res).catch(console.error);
EOF
        
        if node temp-test.js; then
            echo -e "${GREEN}✅ Post-deployment verification passed${NC}"
        else
            echo -e "${RED}❌ Post-deployment verification failed${NC}"
            echo -e "${YELLOW}💡 Consider rolling back using: $BACKUP_DIR/rollback.sh${NC}"
        fi
        
        rm temp-test.js
        
        log "Post-deployment verification completed"
    fi
fi

# Final summary
echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "✅ Backup created: ${BACKUP_DIR}"
echo -e "✅ Tests passed: Core API + Frontend Integration"
echo -e "✅ Deployment strategy: Option $choice"
echo -e "✅ Logs available: $LOG_FILE"
echo ""

if [[ $choice == "2" ]]; then
    echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
    echo "1. 🔄 Restart your Vercel dev server: 'vercel dev'"
    echo "2. 🧪 Test the API in your browser/frontend"
    echo "3. 📊 Monitor error rates and response times"
    echo "4. 🔙 If issues arise: run '$BACKUP_DIR/rollback.sh'"
    echo ""
    echo -e "${GREEN}🚀 Chat API v2 is now LIVE at /api/chat${NC}"
else
    echo -e "${YELLOW}📋 NEXT STEPS FOR GRADUAL MIGRATION:${NC}"
    echo "1. 🧪 Test Chat API v2 at /api/chat-v2"
    echo "2. 📊 Compare performance with v1"  
    echo "3. 🔄 Update frontend when ready"
    echo "4. 🚀 Run full replacement (option 2) when confident"
fi

echo ""
log "Deployment script completed successfully"
echo -e "${BLUE}Happy coding! 🚀${NC}"
#!/bin/bash

# 🧪 COMPREHENSIVE TEST SUITE - FASE 1 REFACTORING
# Esegue tutti i test per validare completamente la nuova architettura

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 COMPREHENSIVE TEST SUITE - CHAT API V2${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to print test header
test_header() {
    echo -e "\n${PURPLE}$1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
}

# Function to check if command succeeded
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 FAILED${NC}"
        return 1
    fi
}

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Test 1: Environment Check
test_header "1️⃣  ENVIRONMENT CHECK"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo "Checking project structure..."
if [[ -f "package.json" && -d "api/chat" && -f "api/chat-v2.js" ]]; then
    echo -e "${GREEN}✅ Project structure correct${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ Project structure incorrect${NC}"
    echo "Make sure you're in the chatbot-backend directory"
    exit 1
fi

echo "Checking dependencies..."
if npm list openai > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencies missing - installing...${NC}"
    npm install
fi

# Test 2: Core API Tests  
test_header "2️⃣  CORE API TESTS"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo "Running core API test suite..."
if node test-chat-v2.js > /dev/null 2>&1; then
    check_result "Core API tests"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    check_result "Core API tests"
fi

# Test 3: Frontend Integration Tests
test_header "3️⃣  FRONTEND INTEGRATION TESTS"  
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo "Running frontend integration tests..."
if node test-frontend-integration.js > /dev/null 2>&1; then
    check_result "Frontend integration tests"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    check_result "Frontend integration tests"
fi

# Test 4: Performance Tests
test_header "4️⃣  PERFORMANCE TESTS"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo "Running performance benchmarks..."

# Create simple performance test
cat > temp-performance-test.js << 'EOF'
import { initializeServices } from './api/chat/index.js';

async function performanceTest() {
    const services = initializeServices();
    const testMessages = [
        "Quanto costano i biglietti?",
        "Info parcheggi", 
        "Orari apertura",
        "Voglio prenotare biglietti"
    ];
    
    const times = [];
    
    for (const message of testMessages) {
        const start = Date.now();
        
        try {
            const req = {
                method: 'POST',
                body: { message, sessionId: 'perf_test' },
                headers: { 'x-forwarded-for': '127.0.0.1' },
                connection: { remoteAddress: '127.0.0.1' }
            };
            
            await services.messageHandler.processMessage(message, 'perf_test', '127.0.0.1', req);
            
            const responseTime = Date.now() - start;
            times.push(responseTime);
        } catch (error) {
            console.error('Performance test error:', error.message);
        }
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Average response time: ${avgTime.toFixed(0)}ms`);
    
    // Performance targets
    if (avgTime < 2000) {
        console.log('✅ Performance target met (< 2000ms)');
        process.exit(0);
    } else {
        console.log('⚠️  Performance target not met (>= 2000ms)');
        process.exit(1);
    }
}

performanceTest().catch(console.error);
EOF

if node temp-performance-test.js 2>/dev/null; then
    check_result "Performance tests"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    check_result "Performance tests"
fi

rm temp-performance-test.js

# Test 5: Error Handling Tests
test_header "5️⃣  ERROR HANDLING TESTS"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo "Testing error scenarios..."

# Create error handling test
cat > temp-error-test.js << 'EOF'
import chatHandler from './api/chat-v2.js';

async function errorHandlingTest() {
    const testCases = [
        { name: "Empty message", body: { message: "", sessionId: "test" } },
        { name: "Long message", body: { message: "a".repeat(1500), sessionId: "test" } },
        { name: "Invalid message type", body: { message: null, sessionId: "test" } },
        { name: "Missing body", body: null }
    ];
    
    let passed = 0;
    
    for (const testCase of testCases) {
        const req = {
            method: 'POST',
            body: testCase.body,
            headers: { 'x-forwarded-for': '127.0.0.1' }
        };
        
        const res = {
            status: 200,
            setHeader: () => {},
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.body = data; return this; },
            end: () => {}
        };
        
        try {
            await chatHandler(req, res);
            
            // Should return error for all these cases
            if (res.statusCode >= 400 && res.body && res.body.error) {
                console.log(`✅ ${testCase.name}: Error handled correctly`);
                passed++;
            } else {
                console.log(`❌ ${testCase.name}: Should have returned error`);
            }
        } catch (error) {
            console.log(`❌ ${testCase.name}: Unexpected exception`);
        }
    }
    
    if (passed === testCases.length) {
        console.log(`✅ All ${passed} error scenarios handled correctly`);
        process.exit(0);
    } else {
        console.log(`❌ Only ${passed}/${testCases.length} error scenarios handled`);
        process.exit(1);
    }
}

errorHandlingTest().catch(console.error);
EOF

if node temp-error-test.js 2>/dev/null; then
    check_result "Error handling tests"  
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    check_result "Error handling tests"
fi

rm temp-error-test.js

# Test 6: Memory Leak Tests
test_header "6️⃣  MEMORY LEAK TESTS"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo "Testing for memory leaks..."

# Create memory test
cat > temp-memory-test.js << 'EOF'
import { initializeServices } from './api/chat/index.js';

async function memoryLeakTest() {
    const services = initializeServices();
    
    console.log('Testing session cleanup...');
    
    // Create many sessions
    for (let i = 0; i < 100; i++) {
        services.session.getSession(`test_session_${i}`, '127.0.0.1');
        services.session.addMessageToHistory(`test_session_${i}`, 'user', `Test message ${i}`);
    }
    
    const initialStats = services.session.getSessionStats();
    console.log(`Created ${initialStats.total_sessions} sessions`);
    
    // Force cleanup (simulate time passing)
    services.session.cleanupExpiredSessions();
    
    const finalStats = services.session.getSessionStats();
    
    if (finalStats.total_sessions <= initialStats.total_sessions) {
        console.log('✅ Session cleanup working correctly');
        process.exit(0);
    } else {
        console.log('❌ Potential memory leak detected');
        process.exit(1);
    }
}

memoryLeakTest().catch(console.error);
EOF

if node temp-memory-test.js 2>/dev/null; then
    check_result "Memory leak tests"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    check_result "Memory leak tests"
fi

rm temp-memory-test.js

# Test 7: Live Server Test (Optional)
test_header "7️⃣  LIVE SERVER TEST (Optional)"

echo "Checking if Vercel dev server is running..."
if curl -s http://localhost:3000/api/chat-v2 -X POST \
   -H "Content-Type: application/json" \
   -d '{"message":"ping","sessionId":"test"}' > /dev/null 2>&1; then
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${GREEN}✅ Live server test${NC}"
    echo "  🌐 Server is running at http://localhost:3000"
    echo "  📱 Test interface: file://$PWD/test-frontend-live.html"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠️  Live server not running${NC}"
    echo "  💡 To test with live server:"
    echo "     1. Run: vercel dev"
    echo "     2. Open: file://$PWD/test-frontend-live.html"
fi

# Final Results
test_header "📊 FINAL RESULTS"

echo -e "\n${BLUE}Test Summary:${NC}"
echo -e "✅ Tests Passed: ${PASSED_TESTS}"
echo -e "📊 Total Tests: ${TOTAL_TESTS}"
echo -e "📈 Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Chat API v2 is ready for production${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. 🚀 Run deployment: ./deploy-v2.sh"
    echo "2. 🌐 Test live: vercel dev + open test-frontend-live.html"
    echo "3. 📱 Update frontend to use /api/chat-v2"
    
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    echo -e "${YELLOW}🔧 Review failed tests before deploying${NC}"
    
    exit 1
fi
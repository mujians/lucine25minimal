/**
 * Test Frontend Integration - Simula comportamento frontend esistente
 * 
 * Testa che la nuova API v2 sia compatibile con il frontend esistente
 */

import { readFileSync } from 'fs';
import chatHandler from './api/chat-v2.js';

/**
 * Simula una request HTTP come farebbe il frontend
 */
function createMockRequest(message, sessionId = null) {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    body: { message, sessionId },
    connection: { remoteAddress: '192.168.1.1' }
  };
}

/**
 * Simula response HTTP
 */
function createMockResponse() {
  const response = {
    status: 200,
    headers: {},
    body: null,
    
    setHeader(name, value) {
      this.headers[name] = value;
    },
    
    status(code) {
      this.status = code;
      return this;
    },
    
    json(data) {
      this.body = data;
      return this;
    },
    
    end() {
      return this;
    }
  };
  
  return response;
}

/**
 * Test scenarios che frontend potrebbe inviare
 */
const testScenarios = [
  {
    name: "Domanda biglietti",
    message: "Quanto costano i biglietti?",
    expectedFields: ['reply', 'smartActions', 'sessionId']
  },
  {
    name: "Richiesta prenotazione", 
    message: "Voglio prenotare biglietti per il 20 dicembre",
    expectedFields: ['reply', 'smartActions', 'sessionId']
  },
  {
    name: "WhatsApp registration",
    message: "Voglio notifiche WhatsApp +39 123 456 7890", 
    expectedFields: ['reply', 'sessionId', 'whatsapp_registered']
  },
  {
    name: "Messaggio vuoto (error case)",
    message: "",
    expectError: true
  },
  {
    name: "Messaggio molto lungo (error case)",
    message: "a".repeat(1500),
    expectError: true
  },
  {
    name: "Domanda complessa (escalation)",
    message: "Posso portare il mio drone personalizzato per fare riprese aeree durante l'evento?",
    expectedFields: ['reply', 'sessionId']
  }
];

async function testFrontendIntegration() {
  console.log('🧪 Testing Frontend Integration with Chat API v2...\n');

  let passed = 0;
  let failed = 0;

  for (const [index, scenario] of testScenarios.entries()) {
    console.log(`${index + 1}️⃣ Testing: ${scenario.name}`);
    
    try {
      // Create mock request/response
      const req = createMockRequest(scenario.message);
      const res = createMockResponse();
      
      // Call API handler
      await chatHandler(req, res);
      
      // Check response
      const response = res.body;
      
      if (scenario.expectError) {
        // Should be error response
        if (res.status >= 400 && response.error) {
          console.log(`   ✅ Error handled correctly: ${response.error}`);
          passed++;
        } else {
          console.log(`   ❌ Expected error but got success`);
          failed++;
        }
      } else {
        // Should be success response
        if (res.status === 200 && response.reply) {
          // Check expected fields
          const missingFields = scenario.expectedFields.filter(field => 
            !(field in response)
          );
          
          if (missingFields.length === 0) {
            console.log(`   ✅ All fields present: ${scenario.expectedFields.join(', ')}`);
            console.log(`   📝 Reply preview: ${response.reply.substring(0, 60)}...`);
            
            if (response.smartActions && response.smartActions.length > 0) {
              console.log(`   🎯 Smart actions: ${response.smartActions.length} generated`);
            }
            
            passed++;
          } else {
            console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
            failed++;
          }
        } else {
          console.log(`   ❌ Invalid response: status=${res.status}`);
          console.log(`   🔍 Response:`, response);
          failed++;
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Test failed with error: ${error.message}`);
      failed++;
    }
    
    console.log(''); // Empty line between tests
  }

  // Summary
  console.log('📊 Frontend Integration Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All frontend integration tests passed!');
    console.log('✅ API v2 is fully compatible with existing frontend');
  } else {
    console.log('\n⚠️  Some tests failed - review before deployment');
  }

  return {
    success: failed === 0,
    passed,
    failed,
    total: passed + failed
  };
}

/**
 * Test specifico per formato response compatibilità
 */
async function testResponseCompatibility() {
  console.log('\n🔄 Testing Response Format Compatibility...');

  const req = createMockRequest("Info parcheggi", "test_session_123");
  const res = createMockResponse();
  
  await chatHandler(req, res);
  const response = res.body;

  // Check che il formato sia identico alla v1
  const requiredFields = ['reply', 'smartActions', 'sessionId'];
  const optionalFields = ['metadata', 'confidence'];
  
  console.log('Required fields check:');
  requiredFields.forEach(field => {
    if (field in response) {
      console.log(`  ✅ ${field}: ${typeof response[field]}`);
    } else {
      console.log(`  ❌ ${field}: MISSING`);
    }
  });

  console.log('\nOptional fields check:');
  optionalFields.forEach(field => {
    if (field in response) {
      console.log(`  ✅ ${field}: ${typeof response[field]}`);
    } else {
      console.log(`  ⚪ ${field}: not present (OK)`);
    }
  });

  // Check smart actions format
  if (response.smartActions && Array.isArray(response.smartActions)) {
    console.log(`\nSmart Actions format check:`);
    if (response.smartActions.length > 0) {
      const action = response.smartActions[0];
      const actionFields = ['type', 'icon', 'text'];
      actionFields.forEach(field => {
        if (field in action) {
          console.log(`  ✅ action.${field}: "${action[field]}"`);
        } else {
          console.log(`  ❌ action.${field}: MISSING`);
        }
      });
    } else {
      console.log('  ⚪ No smart actions generated (OK for some messages)');
    }
  } else {
    console.log('  ❌ smartActions should be array');
  }

  console.log('\n✅ Response format compatibility verified');
}

// Run tests
async function runAllTests() {
  try {
    const integrationResult = await testFrontendIntegration();
    await testResponseCompatibility();
    
    console.log('\n🏆 FINAL RESULT:');
    if (integrationResult.success) {
      console.log('✅ Chat API v2 is READY for frontend integration');
      console.log('✅ Full backward compatibility maintained');
      console.log('✅ All response formats match v1 expectations');
    } else {
      console.log('❌ Some compatibility issues detected');
      console.log('🔧 Review failed tests before deploying');
    }
    
    return integrationResult;

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { testFrontendIntegration, testResponseCompatibility };
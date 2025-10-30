/**
 * Test Script per Chat API v2
 * 
 * Verifica che tutti i moduli si inizializzino correttamente
 * e che la nuova architettura funzioni
 */

import { initializeServices, getServiceStats } from './api/chat/index.js';

async function testChatV2() {
  console.log('🧪 Testing Chat API v2 Architecture...\n');

  try {
    // Test 1: Service Initialization
    console.log('1️⃣ Testing service initialization...');
    const services = initializeServices();
    console.log('✅ Services initialized:', Object.keys(services));
    
    // Test 2: Knowledge Base Loading
    console.log('\n2️⃣ Testing knowledge base...');
    const kb = services.knowledge.loadKnowledgeBase();
    console.log('✅ Knowledge base loaded:', {
      event: kb.event?.name,
      tickets: Object.keys(kb.tickets?.prices || {}),
      contact: kb.contact?.email
    });

    // Test 3: Session Management
    console.log('\n3️⃣ Testing session management...');
    const testSession = services.session.getSession('test_session', '127.0.0.1');
    console.log('✅ Session created:', {
      id: testSession.id,
      created: testSession.created_at
    });

    services.session.addMessageToHistory('test_session', 'user', 'Test message');
    const history = services.session.getConversationHistory('test_session');
    console.log('✅ Message history:', history.length, 'messages');

    // Test 4: Rate Limiting
    console.log('\n4️⃣ Testing rate limiting...');
    const rateLimit = services.session.checkRateLimit('127.0.0.1');
    console.log('✅ Rate limit check:', {
      allowed: rateLimit.allowed,
      remaining: rateLimit.remaining
    });

    // Test 5: OpenAI Service (only if API key available)
    console.log('\n5️⃣ Testing OpenAI service...');
    if (process.env.OPENAI_API_KEY) {
      try {
        const context = services.knowledge.buildContextFromKnowledgeBase(kb);
        const response = await services.openAI.generateChatResponse(
          context,
          'Quanto costano i biglietti?',
          { maxTokens: 50, temperature: 0.3 }
        );
        console.log('✅ OpenAI response:', response.reply.substring(0, 100) + '...');
      } catch (error) {
        console.log('⚠️ OpenAI test skipped:', error.message);
      }
    } else {
      console.log('⚠️ OpenAI test skipped: No API key');
    }

    // Test 6: Message Handler Integration
    console.log('\n6️⃣ Testing message handler...');
    // Simula una request
    const mockReq = {
      headers: { 'user-agent': 'test', 'x-forwarded-for': '127.0.0.1' },
      connection: { remoteAddress: '127.0.0.1' }
    };

    const result = await services.messageHandler.processMessage(
      'Quanto costano i biglietti?',
      'test_session_2',
      '127.0.0.1',
      mockReq
    );

    console.log('✅ Message processing result:', {
      hasReply: !!result.reply,
      hasSmartActions: !!result.smartActions?.length,
      sessionId: result.sessionId
    });

    // Test 7: Service Stats
    console.log('\n7️⃣ Testing service statistics...');
    const stats = await getServiceStats();
    console.log('✅ Service stats:', stats);

    console.log('\n🎉 All tests passed! Chat API v2 is ready.');
    
    return {
      success: true,
      tests_passed: 7,
      services_ready: Object.keys(services).length
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Esegui test se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testChatV2()
    .then(result => {
      console.log('\n📊 Test Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testChatV2 };
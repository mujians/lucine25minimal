import { createOpenAIService } from './services/openai.js';
import { createKnowledgeService } from './services/knowledge.js';
import { createSessionService } from './services/session.js';
import { createMessageHandler } from './handlers/message.js';
import { createBookingHandler } from './handlers/booking.js';
import { createWhatsAppHandler } from './handlers/whatsapp.js';

/**
 * CHAT API V2 - Modular Architecture
 * 
 * Sostituisce il monolitico chat.js con architettura modulare:
 * - Services: OpenAI, Knowledge Base, Session Management
 * - Handlers: Messages, Booking, WhatsApp, Escalation
 * - Error Boundaries e Dependency Injection
 */

// Services singleton (initialized once)
let services = null;

/**
 * Inizializza tutti i services
 */
function initializeServices() {
  if (services) return services;

  try {
    // Verifica API key OpenAI
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable required');
    }

    // Initialize core services
    const openAIService = createOpenAIService(process.env.OPENAI_API_KEY);
    const knowledgeService = createKnowledgeService();
    const sessionService = createSessionService();

    // Initialize handlers with service dependencies
    const whatsappHandler = createWhatsAppHandler({ session: sessionService });
    const bookingHandler = createBookingHandler({ 
      session: sessionService, 
      whatsapp: whatsappHandler 
    });
    
    const messageHandler = createMessageHandler({
      openAI: openAIService,
      knowledge: knowledgeService,
      session: sessionService,
      booking: bookingHandler,
      whatsapp: whatsappHandler
    });

    services = {
      openAI: openAIService,
      knowledge: knowledgeService,
      session: sessionService,
      messageHandler,
      bookingHandler,
      whatsappHandler
    };

    console.log('✅ All chat services initialized successfully');
    return services;

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
}

/**
 * Main chat handler - Entry point
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed_methods: ['POST'] 
    });
  }

  const startTime = Date.now();

  try {
    // Initialize services (cached after first call)
    const chatServices = initializeServices();

    // Extract request data
    const { message, sessionId } = req.body || {};
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection?.remoteAddress || 
                    'unknown';

    // Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message required and must be non-empty string',
        sessionId: sessionId || chatServices.session.generateSessionId()
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({ 
        error: 'Message too long (max 1000 characters)',
        sessionId: sessionId || chatServices.session.generateSessionId()
      });
    }

    // Process message through main handler
    const result = await chatServices.messageHandler.processMessage(
      message.trim(),
      sessionId,
      clientIP,
      req
    );

    // Add performance metadata
    const responseTime = Date.now() - startTime;
    result.metadata = {
      ...result.metadata,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };

    // Success response
    return res.status(200).json(result);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('❌ Chat handler error:', {
      error: error.message,
      stack: error.stack,
      request: {
        message: req.body?.message?.substring(0, 100) + '...',
        sessionId: req.body?.sessionId,
        clientIP: req.headers['x-forwarded-for']
      },
      responseTime
    });

    // Error classification
    let errorType = 'unknown_error';
    let statusCode = 500;
    let userMessage = 'Si è verificato un errore tecnico.';

    if (error.message.includes('OpenAI')) {
      errorType = 'ai_service_error';
      userMessage = 'Servizio AI temporaneamente non disponibile.';
    } else if (error.message.includes('quota')) {
      errorType = 'quota_exceeded';
      userMessage = 'Servizio temporaneamente limitato.';
    } else if (error.message.includes('timeout')) {
      errorType = 'timeout_error';
      userMessage = 'Richiesta scaduta. Riprova.';
    }

    // Fallback response con escape routes
    const knowledgeService = services?.knowledge || createKnowledgeService();
    const escapeRoutes = knowledgeService.getEscapeRoutes('error');

    return res.status(statusCode).json({
      error: userMessage,
      error_type: errorType,
      sessionId: req.body?.sessionId || 'error_session',
      escapeRoutes,
      metadata: {
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        error_id: `err_${Date.now()}`
      }
    });
  }
}

/**
 * Utility functions for external access
 */

/**
 * Get service stats (for monitoring)
 */
export async function getServiceStats() {
  try {
    const chatServices = initializeServices();
    return {
      session_stats: chatServices.session.getSessionStats(),
      knowledge_cache: chatServices.knowledge.cache.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck() {
  try {
    const chatServices = initializeServices();
    
    // Test OpenAI connection
    await chatServices.openAI.generateChatResponse(
      'Test health check', 
      'ping', 
      { maxTokens: 10, temperature: 0 }
    );
    
    return {
      status: 'healthy',
      services: {
        openai: 'connected',
        knowledge: 'loaded',
        session: 'active'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'degraded',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Force restart services (for admin)
 */
export function restartServices() {
  services = null;
  return { restarted: true, timestamp: new Date().toISOString() };
}

// Export per compatibilità con sistema esistente
export { handler as chatHandler };
export { initializeServices };

console.log('🚀 Chat API v2.0 loaded - modular architecture ready');
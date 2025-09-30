import OpenAI from "openai";

/**
 * OpenAI Service - Gestisce le chiamate all'API OpenAI
 */
export class OpenAIService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key required');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Genera risposta chat con context e configurazione
   */
  async generateChatResponse(context, userMessage, options = {}) {
    const {
      model = "gpt-3.5-turbo",
      maxTokens = 250,
      temperature = 0.3
    } = options;

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: context },
          { role: "user", content: userMessage }
        ],
        max_tokens: maxTokens,
        temperature
      });

      const reply = completion?.choices?.[0]?.message?.content?.trim();
      
      if (!reply) {
        throw new Error('Empty response from OpenAI');
      }

      return {
        reply,
        usage: completion.usage,
        model: completion.model,
        finish_reason: completion.choices[0].finish_reason
      };

    } catch (error) {
      // Enhanced error handling
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI quota exceeded');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI rate limit exceeded');
      } else if (error.code === 'invalid_request_error') {
        throw new Error('Invalid request to OpenAI');
      }
      
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Analizza intent del messaggio per routing intelligente
   */
  async analyzeMessageIntent(message, context) {
    const prompt = `
    Analizza questo messaggio e determina il routing ottimale:
    
    Messaggio: "${message}"
    Contesto: ${JSON.stringify(context)}
    
    Categorie:
    1. INFO_SIMPLE: Informazioni base da knowledge base
    2. BOOKING_COMPLEX: Prenotazioni con requisiti specifici  
    3. TECHNICAL_ISSUE: Problemi tecnici
    4. COMPLAINT_URGENT: Reclami urgenti
    5. CUSTOM_REQUEST: Richieste personalizzate
    
    Routing:
    - ai_autonomous: AI gestisce (confidence > 85%)
    - ai_assisted_human: AI + human approval (60-85%)
    - immediate_human: Operatore subito (< 60%)
    - external_system: Sistema esterno necessario
    
    Rispondi JSON:
    {
      "category": "INFO_SIMPLE",
      "confidence": 0.95,
      "suggestedRoute": "ai_autonomous",
      "reasoning": "Domanda standard su prezzi",
      "urgency": "low",
      "escalationProb": 0.15
    }
    `;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4", // GPT-4 per analisi più accurate
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      // Fallback se GPT-4 non disponibile
      return {
        category: "INFO_SIMPLE",
        confidence: 0.7,
        suggestedRoute: "ai_autonomous", 
        reasoning: "Fallback analysis",
        urgency: "low",
        escalationProb: 0.3
      };
    }
  }

  /**
   * Genera smart actions contestuali
   */
  async generateSmartActions(userMessage, chatHistory, knowledgeBase) {
    const prompt = `
    Genera max 3 azioni contestuali per questo messaggio:
    
    Messaggio: ${userMessage}
    Storia recente: ${chatHistory.slice(-2).join('\n')}
    
    Azioni disponibili:
    - Prenota Biglietti: ${knowledgeBase.products?.main_ticket?.url}
    - Indicazioni: Google Maps
    - WhatsApp: Attivazione notifiche
    - Email: Supporto diretto
    
    Format JSON:
    {
      "actions": [
        {
          "type": "primary",
          "icon": "🎫",
          "text": "Prenota Biglietti",
          "url": "https://...",
          "description": "Calendario disponibilità",
          "priority": 9
        }
      ]
    }
    `;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 400
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return result.actions || [];
    } catch (error) {
      console.error('Smart actions generation failed:', error);
      return []; // Return empty array on error
    }
  }
}

/**
 * Factory function per creare istanze OpenAI service
 */
export function createOpenAIService(apiKey) {
  return new OpenAIService(apiKey);
}

export default OpenAIService;
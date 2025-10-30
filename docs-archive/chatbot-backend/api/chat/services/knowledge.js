import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Knowledge Base Service - Gestisce la base di conoscenza
 */
export class KnowledgeService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 ora cache
  }

  /**
   * Carica knowledge base con caching
   */
  loadKnowledgeBase() {
    const cacheKey = 'knowledge_base';
    const now = Date.now();
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      const filePath = join(process.cwd(), 'data', 'knowledge-base.json');
      const data = readFileSync(filePath, 'utf8');
      const kb = JSON.parse(data);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: kb,
        timestamp: now
      });
      
      return kb;
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      return this.getDefaultKnowledgeBase();
    }
  }

  /**
   * Costruisce context per OpenAI da knowledge base
   */
  buildContextFromKnowledgeBase(kb, realtimeInfo = null) {
    const ticketUrl = kb.products?.main_ticket?.url || 
      'https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025';
    
    const availabilityText = realtimeInfo?.available === false ? 
      '\n⚠️ ATTENZIONE: Biglietti attualmente SOLD OUT sul sito' : 
      '\n✅ Acquista online per posto garantito';

    // Info calendario Evey se disponibili
    let calendarInfo = '';
    if (realtimeInfo?.calendar?.has_evey_calendar) {
      calendarInfo = '\n\n📅 CALENDARIO DISPONIBILITÀ:';
      if (realtimeInfo.calendar.calendar_active) {
        calendarInfo += '\n- Sistema di prenotazione attivo';
        if (realtimeInfo.calendar.found_dates?.length > 0) {
          calendarInfo += `\n- Date rilevate: ${realtimeInfo.calendar.found_dates.join(', ')}`;
        }
      } else {
        calendarInfo += '\n- ⚠️ Calendario momentaneamente non disponibile';
      }
    }

    return `Sei l'assistente virtuale delle Lucine di Natale di Leggiuno. Rispondi sempre in italiano, in modo cordiale e preciso.

EVENTO: ${kb.event.name}
Date: ${kb.event.dates.start} - ${kb.event.dates.end} (chiuso ${kb.event.dates.closed.join(', ')})
Orari: ${kb.event.hours.open}-${kb.event.hours.close} (ultimo ingresso ${kb.event.hours.lastEntry})
Luogo: ${kb.event.location.address}, ${kb.event.location.area}

BIGLIETTI:
- Intero: €${kb.tickets.prices.intero}
- Ridotto (3-12 anni): €${kb.tickets.prices.ridotto}
- SaltaFila: €${kb.tickets.prices.saltafila}
- Open Ticket: €${kb.tickets.prices.open}
- Under 3: Gratis
- ${kb.tickets.discounts.online}
🎫 ACQUISTA: ${ticketUrl}${availabilityText}${calendarInfo}

PARCHEGGI: P1-P5, navetta gratuita ${kb.parking?.shuttle?.hours || '17:00-23:30'} ${kb.parking?.shuttle?.frequency || 'ogni 10 min'}

SERVIZI:
- ${kb.services?.accessibility?.description || 'Accessibile a disabili'}
- ${kb.services?.pets?.description || 'Animali ammessi al guinzaglio'}
- Mercatini e stand gastronomici

REGOLE IMPORTANTI:
- ACQUISTO GENERALE: Se qualcuno vuole comprare biglietti in generale, rispondi con "BOOKING_REQUEST"
- PRENOTAZIONI SPECIFICHE: Se vuole biglietti per date specifiche, rispondi con "BOOKING_REQUEST" + data
- WHATSAPP NOTIFICHE: Se chiede notifiche/WhatsApp, rispondi con "WHATSAPP_REQUEST"
- Date 24 o 31 dicembre: avvisa che il parco è CHIUSO
- LINKS: Fornisci URLs complete senza testo aggiuntivo
- Se non sai rispondere, di' che non hai informazioni specifiche
- Suggerisci sempre: email ${kb.contact.email}, WhatsApp ${kb.contact.whatsapp}`;
  }

  /**
   * Verifica se una risposta indica bassa confidence
   */
  isLowConfidenceReply(reply) {
    const indicators = [
      'non sono sicuro',
      'non so', 
      'mi dispiace',
      'non ho informazioni',
      'non posso rispondere',
      'non sono in grado'
    ];
    
    const lower = reply.toLowerCase();
    return indicators.some(indicator => lower.includes(indicator));
  }

  /**
   * Ottiene route di escape per errori
   */
  getEscapeRoutes(type, knowledgeBase) {
    if (!knowledgeBase) knowledgeBase = this.getDefaultKnowledgeBase();
    
    const routes = {
      'rate_limit': [
        "Hai fatto troppe domande di seguito.",
        "Per assistenza immediata:",
        `📧 ${knowledgeBase.contact.email}`,
        `📱 ${knowledgeBase.contact.whatsapp}`
      ],
      'error': [
        "Si è verificato un problema tecnico.",
        `📧 ${knowledgeBase.contact.email}`,
        `📱 ${knowledgeBase.contact.whatsapp}`
      ]
    };
    
    return routes[type] || routes.error;
  }

  /**
   * Knowledge base di default per fallback
   */
  getDefaultKnowledgeBase() {
    return {
      event: {
        name: "Lucine di Natale Leggiuno",
        dates: {
          start: "6 dicembre 2025",
          end: "6 gennaio 2026",
          closed: ["24 dicembre", "31 dicembre"]
        },
        hours: {
          open: "17:30",
          close: "23:00",
          lastEntry: "22:30"
        },
        location: {
          address: "Leggiuno, Varese",
          area: "Lago Maggiore"
        }
      },
      tickets: {
        prices: {
          intero: "9",
          ridotto: "7",
          saltafila: "13",
          open: "25"
        },
        discounts: {
          online: "Sconto €1 acquistando online"
        }
      },
      products: {
        main_ticket: {
          url: "https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025",
          variants: {
            intero: "51699961233747",
            ridotto: "51700035944787",
            saltafila: "51700063207763",
            open: "10082871050579"
          }
        }
      },
      contact: {
        email: "info@lucinedinatale.it",
        whatsapp: "+393123456789"
      },
      parking: {
        shuttle: {
          hours: "17:00-23:30",
          frequency: "ogni 10 min"
        }
      },
      services: {
        accessibility: {
          description: "Percorso accessibile per disabili"
        },
        pets: {
          description: "Animali ammessi al guinzaglio"
        }
      }
    };
  }

  /**
   * Invalida cache (utile per aggiornamenti)
   */
  invalidateCache() {
    this.cache.clear();
  }

  /**
   * Aggiorna knowledge base (per future implementazioni)
   */
  async updateKnowledgeBase(updates) {
    // TODO: Implementare aggiornamento KB con versioning
    this.invalidateCache();
    return { success: true, message: 'Cache invalidated' };
  }
}

/**
 * Factory function
 */
export function createKnowledgeService() {
  return new KnowledgeService();
}

export default KnowledgeService;
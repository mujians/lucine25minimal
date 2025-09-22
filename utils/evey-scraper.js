// 🎯 EVEY SCRAPER - Estrazione disponibilità real-time
// Performance test e affidabilità

export async function scrapeEveyAvailability(targetDate = null) {
  const startTime = Date.now();
  const metrics = {
    startTime,
    fetchTime: 0,
    parseTime: 0,
    totalTime: 0,
    bytesDownloaded: 0,
    success: false,
    error: null,
    reliability: 'unknown'
  };

  try {
    console.log('🔍 Iniziando scraping Evey per disponibilità...');
    
    // STEP 1: Fetch pagina con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    const fetchStart = Date.now();
    const response = await fetch('https://lucinedinatale.it/products/biglietto-parco-lucine-di-natale-2025', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    metrics.fetchTime = Date.now() - fetchStart;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    metrics.bytesDownloaded = new Blob([html]).size;
    
    console.log(`✅ Fetch completato: ${metrics.fetchTime}ms, ${metrics.bytesDownloaded} bytes`);
    
    // STEP 2: Parse dati Evey
    const parseStart = Date.now();
    const eveyData = await parseEveyData(html, targetDate);
    metrics.parseTime = Date.now() - parseStart;
    
    console.log(`✅ Parse completato: ${metrics.parseTime}ms`);
    
    metrics.success = true;
    metrics.reliability = assessReliability(eveyData, html);
    metrics.totalTime = Date.now() - startTime;
    
    return {
      success: true,
      data: eveyData,
      metrics,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    metrics.error = error.message;
    metrics.totalTime = Date.now() - startTime;
    metrics.reliability = 'failed';
    
    console.error('❌ Errore scraping Evey:', error);
    
    return {
      success: false,
      error: error.message,
      metrics,
      timestamp: new Date().toISOString()
    };
  }
}

async function parseEveyData(html, targetDate) {
  const eveyInfo = {
    hasEveyIntegration: false,
    availableSlots: [],
    ticketTypes: [],
    calendar: {
      active: false,
      dates: [],
      timeSlots: {}
    },
    availability: {
      general: true,
      specific: {}
    }
  };

  try {
    // 1. Cerca script Evey
    const eveyScriptMatch = html.match(/evey.*?scheduler.*?/gi);
    if (eveyScriptMatch) {
      eveyInfo.hasEveyIntegration = true;
      console.log('✅ Widget Evey rilevato');
    }

    // 2. Estrai ticketTypes JSON
    const ticketTypesMatch = html.match(/ticketTypes\s*=\s*(\[.*?\]);/s);
    if (ticketTypesMatch) {
      try {
        const ticketTypes = JSON.parse(ticketTypesMatch[1]);
        eveyInfo.ticketTypes = ticketTypes;
        console.log(`✅ Trovati ${ticketTypes.length} tipi biglietto:`, ticketTypes.map(t => `${t.title}: ${t.available || 'N/A'}`));
      } catch (parseErr) {
        console.log('⚠️ Errore parsing ticketTypes JSON');
      }
    }

    // 3. Cerca widget calendario con data-evey-trigger
    const calendarMatch = html.match(/data-evey-trigger="scheduler"[^>]*>/gi);
    if (calendarMatch) {
      eveyInfo.calendar.active = true;
      console.log('✅ Scheduler Evey attivo');
    }

    // 4. Estrai script configurazione Evey
    const eveyConfigMatch = html.match(/evey_settings\s*=\s*{([^}]*)}/s);
    if (eveyConfigMatch) {
      console.log('✅ Configurazione Evey trovata');
    }

    // 5. Cerca indicatori disponibilità
    const availabilityIndicators = [
      { pattern: /sold.out|esaurito|non.disponibil/gi, available: false },
      { pattern: /disponibil|acquista/gi, available: true },
      { pattern: /posti.rimasti|available/gi, available: true }
    ];

    for (const indicator of availabilityIndicators) {
      const matches = html.match(indicator.pattern);
      if (matches && matches.length > 0) {
        eveyInfo.availability.general = indicator.available;
        console.log(`🎯 Indicatore disponibilità: ${indicator.available ? 'DISPONIBILE' : 'NON DISPONIBILE'} (${matches.length} matches)`);
        break;
      }
    }

    // 6. Estrai date specifiche se presenti
    const datePatterns = [
      /(\d{1,2})\s+(dicembre|gennaio|novembre)\s+(\d{4})/gi,
      /(\d{4})-(\d{2})-(\d{2})/g
    ];

    for (const pattern of datePatterns) {
      const dateMatches = [...html.matchAll(pattern)];
      if (dateMatches.length > 0) {
        eveyInfo.calendar.dates = dateMatches.map(match => match[0]).slice(0, 20); // Limita a 20
        console.log(`📅 Trovate ${dateMatches.length} date nel calendar`);
        break;
      }
    }

    // 7. Cerca slot orari se target date specificata
    if (targetDate) {
      const timeSlotPattern = /(\d{1,2}:\d{2})/g;
      const timeMatches = [...html.matchAll(timeSlotPattern)];
      if (timeMatches.length > 0) {
        eveyInfo.availableSlots = [...new Set(timeMatches.map(m => m[1]))]
          .filter(time => {
            const [hours] = time.split(':').map(Number);
            return hours >= 17 && hours <= 23; // Orari evento
          })
          .sort();
        console.log(`⏰ Slot orari estratti: ${eveyInfo.availableSlots.join(', ')}`);
      }
    }

    // 8. Check form cart specifici
    const cartFormMatch = html.match(/form.*?cart.*?add/gi);
    if (cartFormMatch) {
      console.log('✅ Form aggiunta carrello rilevato');
    }

    return eveyInfo;

  } catch (error) {
    console.error('❌ Errore parsing dati Evey:', error);
    throw error;
  }
}

function assessReliability(eveyData, html) {
  let score = 0;
  const checks = [];

  // Check 1: Widget Evey presente
  if (eveyData.hasEveyIntegration) {
    score += 25;
    checks.push('✅ Widget Evey presente');
  } else {
    checks.push('❌ Widget Evey mancante');
  }

  // Check 2: Dati ticket types strutturati
  if (eveyData.ticketTypes.length > 0) {
    score += 30;
    checks.push(`✅ ${eveyData.ticketTypes.length} tipi biglietto rilevati`);
  } else {
    checks.push('❌ Tipi biglietto non trovati');
  }

  // Check 3: Calendar scheduler attivo
  if (eveyData.calendar.active) {
    score += 20;
    checks.push('✅ Scheduler calendario attivo');
  } else {
    checks.push('⚠️ Scheduler calendario incerto');
  }

  // Check 4: Indicatori disponibilità
  if (eveyData.availability.general !== undefined) {
    score += 15;
    checks.push('✅ Indicatori disponibilità trovati');
  } else {
    checks.push('⚠️ Disponibilità non chiara');
  }

  // Check 5: Dimensione HTML ragionevole
  const htmlSize = new Blob([html]).size;
  if (htmlSize > 20000 && htmlSize < 500000) {
    score += 10;
    checks.push(`✅ HTML size ok (${Math.round(htmlSize/1024)}KB)`);
  } else {
    checks.push(`⚠️ HTML size anomalo (${Math.round(htmlSize/1024)}KB)`);
  }

  console.log('\n📊 RELIABILITY ASSESSMENT:');
  checks.forEach(check => console.log(check));
  console.log(`🎯 Score: ${score}/100`);

  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'very_low';
}

// Test rapido per data specifica
export async function quickAvailabilityCheck(date) {
  const result = await scrapeEveyAvailability(date);
  
  if (result.success) {
    const { data, metrics } = result;
    
    return {
      available: data.availability.general,
      slots: data.availableSlots,
      reliability: metrics.reliability,
      responseTime: metrics.totalTime,
      recommended: metrics.reliability === 'high' && metrics.totalTime < 3000
    };
  }
  
  return {
    available: null,
    slots: [],
    reliability: 'failed',
    responseTime: result.metrics.totalTime,
    recommended: false
  };
}

// Performance benchmark
export async function benchmarkScraping(iterations = 3) {
  console.log(`🚀 Benchmark scraping Evey (${iterations} iterazioni)...`);
  
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    console.log(`\n--- Iterazione ${i + 1}/${iterations} ---`);
    const result = await scrapeEveyAvailability();
    results.push(result);
    
    // Pausa tra requests per non sovraccaricare
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Calcola statistiche
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  if (successfulResults.length === 0) {
    return {
      success: false,
      error: 'Tutti i test falliti',
      results
    };
  }
  
  const avgTime = successfulResults.reduce((sum, r) => sum + r.metrics.totalTime, 0) / successfulResults.length;
  const avgBytes = successfulResults.reduce((sum, r) => sum + r.metrics.bytesDownloaded, 0) / successfulResults.length;
  const reliabilityScores = successfulResults.map(r => r.metrics.reliability);
  
  const summary = {
    success: true,
    totalTests: iterations,
    successfulTests: successfulResults.length,
    failureRate: (failedResults.length / iterations * 100).toFixed(1) + '%',
    avgResponseTime: Math.round(avgTime) + 'ms',
    avgDataSize: Math.round(avgBytes / 1024) + 'KB',
    reliabilityDistribution: {
      high: reliabilityScores.filter(s => s === 'high').length,
      medium: reliabilityScores.filter(s => s === 'medium').length,
      low: reliabilityScores.filter(s => s === 'low').length,
      very_low: reliabilityScores.filter(s => s === 'very_low').length
    },
    recommendation: getRecommendation(successfulResults, avgTime)
  };
  
  console.log('\n📈 BENCHMARK SUMMARY:');
  console.log(JSON.stringify(summary, null, 2));
  
  return {
    success: true,
    summary,
    results
  };
}

function getRecommendation(results, avgTime) {
  const reliableResults = results.filter(r => ['high', 'medium'].includes(r.metrics.reliability));
  const fastResults = results.filter(r => r.metrics.totalTime < 3000);
  
  if (reliableResults.length === results.length && avgTime < 2000) {
    return {
      verdict: 'RECOMMENDED',
      reason: 'Alta affidabilità e performance eccellenti',
      suggestion: 'Implementare in produzione con cache 5min'
    };
  } else if (reliableResults.length >= results.length * 0.8 && avgTime < 4000) {
    return {
      verdict: 'ACCEPTABLE',
      reason: 'Buona affidabilità, performance accettabili', 
      suggestion: 'Implementare con fallback e cache 10min'
    };
  } else {
    return {
      verdict: 'NOT_RECOMMENDED',
      reason: 'Affidabilità o performance insufficienti',
      suggestion: 'Usare solo fallback al calendario standard'
    };
  }
}
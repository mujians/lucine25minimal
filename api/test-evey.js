// 🧪 TEST ENDPOINT per Evey Scraper Performance
import { scrapeEveyAvailability, quickAvailabilityCheck, benchmarkScraping } from '../utils/evey-scraper.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action = 'quick', date, benchmark_iterations = '3' } = req.query;

  try {
    console.log(`🧪 Test Evey - Action: ${action}`);

    switch (action) {
      case 'quick':
        console.log('⚡ Quick availability check...');
        const quickResult = await quickAvailabilityCheck(date);
        
        return res.status(200).json({
          action: 'quick_check',
          date: date || 'general',
          result: quickResult,
          timestamp: new Date().toISOString(),
          interpretation: {
            usable: quickResult.recommended,
            status: quickResult.available ? 'AVAILABLE' : quickResult.available === false ? 'NOT_AVAILABLE' : 'UNKNOWN',
            performance: quickResult.responseTime < 2000 ? 'EXCELLENT' : quickResult.responseTime < 4000 ? 'GOOD' : 'SLOW',
            reliability: quickResult.reliability
          }
        });

      case 'detailed':
        console.log('🔍 Detailed scraping analysis...');
        const detailedResult = await scrapeEveyAvailability(date);
        
        return res.status(200).json({
          action: 'detailed_scraping',
          date: date || 'general',
          result: detailedResult,
          timestamp: new Date().toISOString(),
          summary: {
            success: detailedResult.success,
            responseTime: detailedResult.metrics?.totalTime || null,
            dataSize: detailedResult.metrics?.bytesDownloaded || null,
            reliability: detailedResult.metrics?.reliability || null,
            eveyIntegration: detailedResult.data?.hasEveyIntegration || false,
            ticketTypesFound: detailedResult.data?.ticketTypes?.length || 0,
            availableSlots: detailedResult.data?.availableSlots?.length || 0
          }
        });

      case 'benchmark':
        console.log(`🚀 Performance benchmark (${benchmark_iterations} iterations)...`);
        const iterations = parseInt(benchmark_iterations) || 3;
        if (iterations > 10) {
          return res.status(400).json({
            error: 'Max 10 iterations allowed for benchmark'
          });
        }
        
        const benchmarkResult = await benchmarkScraping(iterations);
        
        return res.status(200).json({
          action: 'performance_benchmark',
          iterations,
          result: benchmarkResult,
          timestamp: new Date().toISOString(),
          recommendations: benchmarkResult.success ? 
            generateProductionRecommendations(benchmarkResult.summary) : 
            { verdict: 'FAILED', reason: 'Benchmark failed completely' }
        });

      case 'status':
        // Test rapido per monitoring
        const start = Date.now();
        const statusCheck = await quickAvailabilityCheck();
        const elapsed = Date.now() - start;
        
        return res.status(200).json({
          action: 'health_status',
          status: statusCheck.recommended ? 'HEALTHY' : 'DEGRADED',
          responseTime: elapsed,
          available: statusCheck.available,
          reliability: statusCheck.reliability,
          timestamp: new Date().toISOString(),
          uptime: statusCheck.recommended
        });

      default:
        return res.status(400).json({
          error: 'Invalid action',
          validActions: ['quick', 'detailed', 'benchmark', 'status'],
          examples: [
            '/api/test-evey?action=quick',
            '/api/test-evey?action=detailed&date=2024-12-23',
            '/api/test-evey?action=benchmark&benchmark_iterations=5',
            '/api/test-evey?action=status'
          ]
        });
    }

  } catch (error) {
    console.error('❌ Test Evey error:', error);
    
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      action,
      timestamp: new Date().toISOString()
    });
  }
}

function generateProductionRecommendations(summary) {
  const { avgResponseTime, reliabilityDistribution, successfulTests, totalTests } = summary;
  
  const avgTime = parseInt(avgResponseTime);
  const successRate = successfulTests / totalTests;
  const highReliability = reliabilityDistribution.high / successfulTests;
  
  // Scoring algoritmo
  let score = 0;
  
  // Performance scoring (40 points max)
  if (avgTime < 1500) score += 40;
  else if (avgTime < 2500) score += 30;
  else if (avgTime < 4000) score += 20;
  else if (avgTime < 6000) score += 10;
  
  // Reliability scoring (35 points max)
  if (highReliability >= 0.8) score += 35;
  else if (highReliability >= 0.6) score += 25;
  else if (highReliability >= 0.4) score += 15;
  else if (highReliability >= 0.2) score += 5;
  
  // Success rate scoring (25 points max)
  if (successRate >= 0.95) score += 25;
  else if (successRate >= 0.85) score += 20;
  else if (successRate >= 0.70) score += 15;
  else if (successRate >= 0.50) score += 10;
  
  // Genera raccomandazioni
  if (score >= 85) {
    return {
      verdict: 'PRODUCTION_READY',
      score: `${score}/100`,
      implementation: 'Implementare con cache 3-5 minuti',
      fallback: 'Fallback opzionale dopo 3 tentativi',
      monitoring: 'Monitor settimanale sufficiente',
      maxFrequency: 'Ogni richiesta utente con rate limiting'
    };
  } else if (score >= 65) {
    return {
      verdict: 'PRODUCTION_ACCEPTABLE',
      score: `${score}/100`,
      implementation: 'Implementare con cache 10 minuti + fallback obbligatorio',
      fallback: 'Fallback dopo 2 tentativi o >4s timeout',
      monitoring: 'Monitor giornaliero consigliato',
      maxFrequency: 'Max 1 scraping ogni 30s per utente'
    };
  } else if (score >= 40) {
    return {
      verdict: 'LIMITED_USE',
      score: `${score}/100`,
      implementation: 'Solo per admin/debug, non per utenti finali',
      fallback: 'Sempre fallback, scraping come enrichment',
      monitoring: 'Monitor ogni request obbligatorio',
      maxFrequency: 'Max 1 scraping ogni 5 minuti totale'
    };
  } else {
    return {
      verdict: 'NOT_RECOMMENDED',
      score: `${score}/100`,
      implementation: 'Non implementare in produzione',
      fallback: 'Solo calendario standard',
      monitoring: 'Solo test occasionali',
      maxFrequency: 'Mai in automatico'
    };
  }
}
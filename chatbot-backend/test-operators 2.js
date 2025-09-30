#!/usr/bin/env node

// Script test per verificare logica operators API
import { isOperatorAvailable, getChatSession, isSessionWithOperator } from './api/operators.js';

console.log('🧪 TEST SISTEMA OPERATORI\n');

// Test 1: Verifica nessun operatore inizialmente
console.log('1. Test: Nessun operatore disponibile inizialmente');
const available1 = isOperatorAvailable();
console.log(`   Operatori disponibili: ${available1} (dovrebbe essere false)`);

// Test 2: Verifica sessioni
console.log('\n2. Test: Sessioni chat');
const session1 = getChatSession('test_session_123');
console.log(`   Chat session 'test_session_123': ${session1 ? 'trovata' : 'non trovata'} (dovrebbe essere non trovata)`);

const sessionWithOp = isSessionWithOperator('test_session_123');
console.log(`   Sessione con operatore: ${sessionWithOp} (dovrebbe essere false)`);

console.log('\n✅ Test base completati');
console.log('\n📝 Per test completi:');
console.log('   1. Avvia server Vercel/locale');
console.log('   2. Usa curl per chiamare endpoint');
console.log('   3. Verifica Google Sheets');
console.log('   4. Controlla ticket system');
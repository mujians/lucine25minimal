# Keep-Alive Setup for Vercel

## Problema
Vercel functions vanno in "cold start" dopo ~15 minuti di inattività, causando:
- Primo request lento (5-10 secondi)
- Perdita delle sessioni in memoria

## Soluzione 1: Endpoint Ping Interno
- **Endpoint**: `/api/ping`
- **Funzione**: Tiene calde le functions principali
- **Test**: `curl https://chatbot-backend-3h4uzkand-brunos-projects-075c84f2.vercel.app/api/ping`

## Soluzione 2: Servizio Esterno Gratuito

### UptimeRobot (Raccomandato)
1. Vai su https://uptimerobot.com/
2. Crea account gratuito
3. Aggiungi monitor:
   - Type: HTTP(s)
   - URL: `https://chatbot-backend-3h4uzkand-brunos-projects-075c84f2.vercel.app/api/ping`
   - Monitoring Interval: 5 minutes (gratis)
   - Name: "Chatbot Keep-Alive"

### Alternativa: Cron-Job.org
1. Vai su https://cron-job.org/
2. Registrati gratuitamente
3. Crea job:
   - URL: `https://chatbot-backend-3h4uzkand-brunos-projects-075c84f2.vercel.app/api/ping`
   - Interval: ogni 10 minuti
   - Method: GET

## Risultato
✅ Functions sempre calde
✅ Sessioni chat persistenti
✅ Response time costante (~200ms)
// Keep-alive endpoint
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const timestamp = new Date().toISOString();
  
  // Ping anche gli altri endpoint per tenerli caldi
  try {
    const baseUrl = `https://${req.headers.host}`;
    
    // Ping chat API
    await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping', sessionId: 'keepalive-ping' })
    }).catch(() => {}); // Ignora errori
    
    // Ping operators API  
    await fetch(`${baseUrl}/api/operators?action=status`)
      .catch(() => {}); // Ignora errori
      
  } catch (error) {
    console.log('Ping error (ignored):', error.message);
  }

  return res.status(200).json({
    status: 'alive',
    timestamp,
    message: 'Vercel functions warmed up',
    uptime: process.uptime()
  });
}
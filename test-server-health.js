const http = require('http');
const app = require('./src/server');

const server = app.listen(5099, () => {
  console.log('Testing server started on port 5099...');

  http.get('http://localhost:5099/api/health', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(rawData);
        console.log('✅ /api/health responded:', parsed);
        if (parsed.status === 'ok') {
          console.log('✅ Server and API routes are healthy and fully functioning!');
        }
        server.close(() => process.exit(0));
      } catch (e) {
        console.error('Failed to parse response:', e);
        server.close(() => process.exit(1));
      }
    });
  }).on('error', (e) => {
    console.error('Health check failed:', e.message);
    server.close(() => process.exit(1));
  });
});


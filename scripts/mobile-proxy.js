const http = require('http');

const proxy = http.createServer((clientReq, clientRes) => {
  const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: '127.0.0.1:3000',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    clientRes.end('Bad Gateway: Next.js dev server is not responding.');
  });

  clientReq.pipe(proxyReq, { end: true });
});

proxy.listen(3001, '0.0.0.0', () => {
  console.log('Mobile proxy active on http://0.0.0.0:3001 -> http://127.0.0.1:3000');
});


const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_KEY = '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';

app.post('/api/anthropic/v1/messages', (req, res) => {
  const data = JSON.stringify(req.body);
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(data),
    },
  };
  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => res.status(500).json({ error: e.message }));
  proxyReq.write(data);
  proxyReq.end();
});

app.listen(3001, () => console.log('Proxy server running on port 3001'));
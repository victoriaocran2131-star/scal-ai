const https = require('https');

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'scal-ai-deploy',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('No GITHUB_TOKEN found. Please set it.');
    console.log('Alternatively, enable GitHub Pages manually:');
    console.log('1. Go to https://github.com/victoriaocran2131-star/scal-ai/settings/pages');
    console.log('2. Set Source to "Deploy from a branch"');
    console.log('3. Set Branch to "main" and folder to "/web"');
    console.log('4. Click Save');
    return;
  }

  try {
    const result = await apiCall('POST', '/repos/victoriaocran2131-star/scal-ai/pages', {
      source: { branch: 'main', path: '/web' }
    }, token);
    console.log('Pages enabled:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();

const http = require('http');

function postLibrary(userId, gameId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ userId, gameId });
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/library',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getLibrary(userId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/library/${userId}`,
      method: 'GET'
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    console.log('POSTing userId=2 gameId=1');
    const post = await postLibrary(2, 1);
    console.log('POST result:', post.status, post.body);

    console.log('\nGETting library for userId=2');
    const get = await getLibrary(2);
    console.log('GET result:', get.status, get.body);
  } catch (err) {
    console.error('Error during requests:', err);
  }
})();

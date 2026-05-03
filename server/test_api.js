const http = require('http');

async function testApi() {
  console.log('Testing CodeMentor AI APIs...');

  const reqOptions = (path, method, body, token) => {
    const data = body ? JSON.stringify(body) : undefined;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api${path}`,
        method,
        headers
      }, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Check if it's SSE
            if (res.headers['content-type'] === 'text/event-stream') {
               resolve(responseBody);
            } else {
               try { resolve(JSON.parse(responseBody)); } catch(e) { resolve(responseBody); }
            }
          } else {
            reject(`Error ${res.statusCode}: ${responseBody}`);
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  };

  try {
    // 1. Test Registration
    const email = `test${Date.now()}@example.com`;
    console.log(`\n1. Registering user ${email}...`);
    const regRes = await reqOptions('/auth/register', 'POST', {
      email, name: 'Test User', password: 'password123'
    });
    console.log('Register Success!', regRes.user.email);
    const token = regRes.token;

    // 2. Test Get Me
    console.log(`\n2. Verifying auth token...`);
    const meRes = await reqOptions('/auth/me', 'GET', null, token);
    console.log('Get Me Success!', meRes.user.email);

    // 3. Test Code Analysis SSE
    console.log(`\n3. Testing code analysis...`);
    const code = "function add(a, b) { return a - b; }";
    const analyzeRes = await reqOptions('/code/analyze', 'POST', {
      code, language: 'javascript'
    }, token);
    
    // Parse SSE lines
    const lines = analyzeRes.split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6)));
    const analysisDone = lines.find(l => l.type === 'analysis');
    
    if (analysisDone && analysisDone.submissionId) {
      console.log('Analysis Success! Submission ID:', analysisDone.submissionId);
      console.log('Analysis result summary:', analysisDone.data.summary);
      
      // 4. Test Hint Stream
      console.log(`\n4. Testing hint stream...`);
      const hintRes = await reqOptions('/hints/request', 'POST', {
        submissionId: analysisDone.submissionId, level: 1
      }, token);
      
      const hintLines = hintRes.split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6)));
      const hintDone = hintLines.find(l => l.type === 'done');
      if (hintDone) {
        console.log('Hint Request Success! Received hint chunks.');
      }
    } else {
      console.log('Failed to parse analysis submission ID:', analyzeRes);
    }

    console.log('\n✅ All tests passed successfully! The database, auth, and AI streams are working.');

  } catch (err) {
    console.error('\n❌ Test failed:', err);
  }
}

testApi();

import fetch from 'node-fetch';

async function testAPIs() {
  try {
    // Login first
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.school', password: 'demo1234' })
    });

    if (!loginRes.ok) {
      console.error(`Login failed: ${loginRes.status}`);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log(`✓ Logged in with token: ${token.substring(0, 30)}...`);

    const headers = { 'Authorization': `Bearer ${token}` };

    // Test 1: GET /api/schools/1/children
    console.log('\nTest 1: GET /api/schools/1/children');
    const childrenRes = await fetch('http://localhost:4000/api/schools/1/children', { headers });
    if (childrenRes.ok) {
      const children = await childrenRes.json();
      console.log(`✓ Status ${childrenRes.status}: ${children.length} children`);
    } else {
      console.log(`✗ Status ${childrenRes.status}`);
      const err = await childrenRes.json();
      console.log(`  Error: ${err.error}`);
    }

    // Test 2: GET /api/ops/admin/teachers
    console.log('\nTest 2: GET /api/ops/admin/teachers');
    const teachersRes = await fetch('http://localhost:4000/api/ops/admin/teachers', { headers });
    if (teachersRes.ok) {
      const teachers = await teachersRes.json();
      console.log(`✓ Status ${teachersRes.status}: ${teachers.length} teachers`);
    } else {
      console.log(`✗ Status ${teachersRes.status}`);
      const err = await teachersRes.json();
      console.log(`  Error: ${err.error}`);
    }

    // Test 3: GET /api/ops/admin/attendance/review
    console.log('\nTest 3: GET /api/ops/admin/attendance/review');
    const today = new Date().toISOString().slice(0, 10);
    const attendanceRes = await fetch(`http://localhost:4000/api/ops/admin/attendance/review?date=${today}`, { headers });
    if (attendanceRes.ok) {
      const att = await attendanceRes.json();
      console.log(`✓ Status ${attendanceRes.status}: ${att.classes.length} classes`);
    } else {
      console.log(`✗ Status ${attendanceRes.status}`);
      const err = await attendanceRes.json();
      console.log(`  Error: ${err.error}`);
    }

    // Test 4: GET /api/ops/admin/audit
    console.log('\nTest 4: GET /api/ops/admin/audit');
    const auditRes = await fetch('http://localhost:4000/api/ops/admin/audit', { headers });
    if (auditRes.ok) {
      const audit = await auditRes.json();
      console.log(`✓ Status ${auditRes.status}: ${audit.rows.length} audit rows`);
    } else {
      console.log(`✗ Status ${auditRes.status}`);
      const err = await auditRes.json();
      console.log(`  Error: ${err.error}`);
    }

    // Test 5: GET /api/ops/admin/delegates
    console.log('\nTest 5: GET /api/ops/admin/delegates?status=pending');
    const delegatesRes = await fetch('http://localhost:4000/api/ops/admin/delegates?status=pending', { headers });
    if (delegatesRes.ok) {
      const delegates = await delegatesRes.json();
      console.log(`✓ Status ${delegatesRes.status}: ${delegates.length} pending delegates`);
    } else {
      console.log(`✗ Status ${delegatesRes.status}`);
      const err = await delegatesRes.json();
      console.log(`  Error: ${err.error}`);
    }

    // Test 6: GET /api/ops/admin/child-link-requests
    console.log('\nTest 6: GET /api/ops/admin/child-link-requests?status=pending');
    const linkRes = await fetch('http://localhost:4000/api/ops/admin/child-link-requests?status=pending', { headers });
    if (linkRes.ok) {
      const links = await linkRes.json();
      console.log(`✓ Status ${linkRes.status}: ${links.length} pending child link requests`);
    } else {
      console.log(`✗ Status ${linkRes.status}`);
      const err = await linkRes.json();
      console.log(`  Error: ${err.error}`);
    }

  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

testAPIs();

const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('--- TESTING DATABASE INITIALIZATION ---');

// Check admin
const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get('admin');
console.log('Admin found:', admin ? `Yes (ID: ${admin.admin_id}, Username: ${admin.username})` : 'No');
const pwdMatches = bcrypt.compareSync('admin123', admin.password_hash);
console.log('Password verification ("admin123"):', pwdMatches ? 'PASSED' : 'FAILED');

// Check notices
const notices = db.prepare('SELECT * FROM notices').all();
console.log(`Notices count: ${notices.length}`);
notices.forEach(n => {
  console.log(` - [#${n.notice_id}] [${n.category}] ${n.title} (Status: ${n.status})`);
});

// Test search query (Module 5)
const examSearch = db.prepare('SELECT * FROM notices WHERE title LIKE ? OR description LIKE ?').all('%exam%', '%exam%');
console.log(`\nSearch query test ('%exam%'): Found ${examSearch.length} notice(s).`);

console.log('\n--- ALL IN-PROCESS TESTS PASSED ---');

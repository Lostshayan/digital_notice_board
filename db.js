const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, 'notices.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema (matching presentation slides 8 & 9)
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notices (
      notice_id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiry_date DATE,
      status TEXT DEFAULT 'published',
      FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
    CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at);
  `);

  // Seed default admin if none exists
  const existingAdmin = db.prepare('SELECT * FROM admin LIMIT 1').get();
  let defaultAdminId;

  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);
    const info = db.prepare(`
      INSERT INTO admin (username, password_hash)
      VALUES (?, ?)
    `).run('admin', passwordHash);
    defaultAdminId = info.lastInsertRowid;
    console.log('✓ Created default admin: username="admin", password="admin123"');
  } else {
    defaultAdminId = existingAdmin.admin_id;
  }

  // Seed initial realistic sample notices if empty
  const noticeCount = db.prepare('SELECT COUNT(*) as count FROM notices').get().count;
  if (noticeCount === 0) {
    const insertNotice = db.prepare(`
      INSERT INTO notices (admin_id, title, description, category, created_at, expiry_date, status)
      VALUES (?, ?, ?, ?, datetime('now', ?), ?, ?)
    `);

    const sampleNotices = [
      {
        title: 'End-Semester Examination Schedule - Winter 2026',
        description: 'The timetable for the upcoming End-Semester Examinations has been officially published. Theory examinations will commence from December 1st, 2026. Hall tickets will be downloadable through the student portal starting next Monday. Ensure all library dues are cleared.',
        category: 'Academic',
        offset: '-2 hours',
        expiry: '2026-12-15',
        status: 'published'
      },
      {
        title: 'Annual Web Tech Hackathon 2026: Registration Open',
        description: 'Join the annual 36-hour code sprint! Build innovative web applications addressing sustainability, AI tooling, or institutional workflows. Cash prizes up to $5,000 for top 3 teams. Registration closes on November 20th.',
        category: 'Event',
        offset: '-1 day',
        expiry: '2026-11-20',
        status: 'published'
      },
      {
        title: 'Campus Central Library 24x7 Extended Hours',
        description: 'To facilitate preparation for mid-terms and finals, the central library and digital reading rooms will operate 24 hours a day with valid campus RFID verification. High-speed Wi-Fi and silent reading pods available on floors 2 & 3.',
        category: 'Facility',
        offset: '-2 days',
        expiry: '2026-12-20',
        status: 'published'
      },
      {
        title: 'Scheduled IT Infrastructure & Wi-Fi Maintenance',
        description: 'The campus datacenter will undergo scheduled network maintenance this Sunday between 02:00 AM and 06:00 AM IST. Intermittent interruptions in campus Wi-Fi, intranet portals, and proxy access may occur.',
        category: 'Urgent',
        offset: '-3 days',
        expiry: '2026-11-10',
        status: 'published'
      },
      {
        title: 'Guest Lecture: Modern Microservices with Node.js & Cloud',
        description: 'Department of Computer Science invites industry veteran Ms. Priya Sharma for a lecture on architecting scalable modern backends and moving away from legacy monolithic web stacks. Auditorium A, Friday at 3:00 PM.',
        category: 'Seminar',
        offset: '-5 days',
        expiry: '2026-11-15',
        status: 'published'
      },
      {
        title: 'Inter-College Sports Tournament Tryouts',
        description: 'Football, Basketball, and Badminton selections begin this Thursday at the sports complex. Registered student athletes must bring their valid student ID and athletic medical clearance certificate.',
        category: 'Sports',
        offset: '-10 days',
        expiry: '2026-11-18',
        status: 'published'
      }
    ];

    for (const notice of sampleNotices) {
      insertNotice.run(
        defaultAdminId,
        notice.title,
        notice.description,
        notice.category,
        notice.offset,
        notice.expiry,
        notice.status
      );
    }
    console.log(`✓ Seeded ${sampleNotices.length} initial notices.`);
  }
}

initDatabase();

module.exports = db;

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'digital-notice-board-secret-key-2026';

// In-memory active session store (token -> admin info)
const activeSessions = new Map();

// Helper to create a signed session token
function createSession(admin) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    admin_id: admin.admin_id,
    username: admin.username,
    createdAt: Date.now()
  };
  activeSessions.set(token, sessionData);
  return token;
}

// Authentication middleware
function requireAdmin(req, res, next) {
  const token = req.cookies.admin_session || req.headers.authorization?.replace('Bearer ', '');
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please log in as an admin.' });
  }
  req.admin = activeSessions.get(token);
  next();
}

// Global middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SESSION_SECRET));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// MODULE 1: AUTHENTICATION ROUTES (Admin Login & Session check)
// -------------------------------------------------------------

// Admin login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username.trim());
  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const match = bcrypt.compareSync(password, admin.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = createSession(admin);
  res.cookie('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  return res.json({
    success: true,
    message: 'Login successful.',
    admin: {
      admin_id: admin.admin_id,
      username: admin.username
    }
  });
});

// Admin logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.admin_session;
  if (token) {
    activeSessions.delete(token);
  }
  res.clearCookie('admin_session');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Check current session
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.admin_session || req.headers.authorization?.replace('Bearer ', '');
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ authenticated: false });
  }
  const session = activeSessions.get(token);
  res.json({
    authenticated: true,
    admin: {
      admin_id: session.admin_id,
      username: session.username
    }
  });
});

// -------------------------------------------------------------
// MODULE 4 & 5: VISITOR NOTICES & SEARCH/FILTER (Public API)
// -------------------------------------------------------------

// Get all published notices with search & date filters
app.get('/api/notices', (req, res) => {
  try {
    const { search, date, category } = req.query;

    let query = `
      SELECT n.notice_id, n.title, n.description, n.category, n.created_at, n.expiry_date, n.status, a.username as author
      FROM notices n
      JOIN admin a ON n.admin_id = a.admin_id
      WHERE n.status = 'published'
    `;
    const params = [];

    // Search keyword in title or description (Module 5)
    if (search && search.trim() !== '') {
      query += ` AND (n.title LIKE ? OR n.description LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    // Filter by specific creation date (Module 5)
    if (date && date.trim() !== '') {
      query += ` AND DATE(n.created_at) = ?`;
      params.push(date.trim());
    }

    // Filter by category
    if (category && category.trim() !== '' && category !== 'All') {
      query += ` AND n.category = ?`;
      params.push(category.trim());
    }

    query += ` ORDER BY n.created_at DESC`;

    const notices = db.prepare(query).all(...params);
    res.json({ success: true, count: notices.length, notices });
  } catch (err) {
    console.error('Error fetching notices:', err);
    res.status(500).json({ error: 'Failed to retrieve notices.' });
  }
});

// Get single notice detail
app.get('/api/notices/:id', (req, res) => {
  try {
    const notice = db.prepare(`
      SELECT n.notice_id, n.title, n.description, n.category, n.created_at, n.expiry_date, n.status, a.username as author
      FROM notices n
      JOIN admin a ON n.admin_id = a.admin_id
      WHERE n.notice_id = ?
    `).get(req.params.id);

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found.' });
    }
    res.json({ success: true, notice });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notice.' });
  }
});

// -------------------------------------------------------------
// MODULE 2: NOTICE MANAGEMENT (Admin API - Protected)
// -------------------------------------------------------------

// Get all notices (all statuses: published, archived, draft)
app.get('/api/admin/notices', requireAdmin, (req, res) => {
  try {
    const notices = db.prepare(`
      SELECT n.notice_id, n.admin_id, n.title, n.description, n.category, n.created_at, n.expiry_date, n.status, a.username as author
      FROM notices n
      JOIN admin a ON n.admin_id = a.admin_id
      ORDER BY n.created_at DESC
    `).all();

    res.json({ success: true, count: notices.length, notices });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin notices.' });
  }
});

// Get dashboard statistics
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM notices').get().count;
    const published = db.prepare("SELECT COUNT(*) as count FROM notices WHERE status = 'published'").get().count;
    const archived = db.prepare("SELECT COUNT(*) as count FROM notices WHERE status = 'archived'").get().count;
    const expiringSoon = db.prepare(`
      SELECT COUNT(*) as count FROM notices
      WHERE expiry_date IS NOT NULL
      AND expiry_date >= DATE('now')
      AND expiry_date <= DATE('now', '+7 days')
      AND status = 'published'
    `).get().count;

    res.json({
      success: true,
      stats: { total, published, archived, expiringSoon }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// Add new notice
app.post('/api/admin/notices', requireAdmin, (req, res) => {
  try {
    const { title, description, category, expiry_date, status } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO notices (admin_id, title, description, category, expiry_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.admin.admin_id,
      title.trim(),
      description.trim(),
      category?.trim() || 'General',
      expiry_date ? expiry_date.trim() : null,
      status || 'published'
    );

    const newNotice = db.prepare('SELECT * FROM notices WHERE notice_id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Notice published successfully.', notice: newNotice });
  } catch (err) {
    console.error('Error creating notice:', err);
    res.status(500).json({ error: 'Failed to publish notice.' });
  }
});

// Update existing notice
app.put('/api/admin/notices/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, expiry_date, status } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const check = db.prepare('SELECT * FROM notices WHERE notice_id = ?').get(id);
    if (!check) {
      return res.status(404).json({ error: 'Notice not found.' });
    }

    const stmt = db.prepare(`
      UPDATE notices
      SET title = ?, description = ?, category = ?, expiry_date = ?, status = ?
      WHERE notice_id = ?
    `);

    stmt.run(
      title.trim(),
      description.trim(),
      category?.trim() || 'General',
      expiry_date ? expiry_date.trim() : null,
      status || 'published',
      id
    );

    const updated = db.prepare('SELECT * FROM notices WHERE notice_id = ?').get(id);
    res.json({ success: true, message: 'Notice updated successfully.', notice: updated });
  } catch (err) {
    console.error('Error updating notice:', err);
    res.status(500).json({ error: 'Failed to update notice.' });
  }
});

// Quickly toggle notice status (published / archived)
app.patch('/api/admin/notices/:id/status', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['published', 'archived', 'draft'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const stmt = db.prepare('UPDATE notices SET status = ? WHERE notice_id = ?');
    const result = stmt.run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notice not found.' });
    }

    res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// Delete notice
app.delete('/api/admin/notices/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM notices WHERE notice_id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notice not found.' });
    }

    res.json({ success: true, message: 'Notice deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notice.' });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Digital Notice Board Server is running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(` Default Credentials: username="admin", password="admin123"`);
  console.log(`====================================================`);
});

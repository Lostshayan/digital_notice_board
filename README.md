# Digital Notice Board (Web Technology Project)

A modern, responsive web application for educational institutions and organizations to publish, manage, and access notices digitally.

This project is an upgraded, modern reimplementation of the **Digital Notice Board** originally designed for PHP/XAMPP, built using **Node.js, Express, and SQLite**.

---

## 🚀 Key Advantages Over the PHP / XAMPP Stack

| Feature | Original Stack (PHP + XAMPP) | Upgraded Stack (Node.js + SQLite) |
|---|---|---|
| **Server Requirement** | Heavy XAMPP suite (Apache + MySQL daemons) | Lightweight built-in Node.js server (`npm start`) |
| **Database** | Requires MySQL service & phpMyAdmin configuration | Zero-config, self-contained single file SQLite database (`notices.db`) |
| **Architecture** | Server-side rendered PHP scripts mixed with HTML | Clean RESTful API backend + modular modern frontend |
| **Search & Filter** | Full page reloads on search queries | Instant, debounced live search & reactive category chips |
| **Security** | Manual session management | Bcrypt hashed passwords + HTTP-only session cookies |

---

## 📦 System Modules (Slide Architecture)

The system fulfills all 5 core modules specified in the project requirements:

1. **Module 1: Admin Login (`/admin.html`)**
   - Secure login form with username & password.
   - Passwords securely verified using `bcrypt`.
   - Protected HTTP-only session cookie authentication with `/api/auth/me` checks.
   - Logout clears active sessions.

2. **Module 2: Notice Management**
   - **Create**: Add new announcements with title, category, expiry date, status, and body text.
   - **Edit**: Inline modal editor to update existing notices.
   - **Toggle Status**: Instant one-click switcher between `Published` (visible) and `Archived` (hidden).
   - **Delete**: Soft or hard deletion with confirmation safeguards.
   - **Dashboard Metrics**: Real-time counters for Total Notices, Live Published, Archived, and Expiring Soon.

3. **Module 3: Database (`db.js`)**
   - Fully relational schema matching the ER diagram:
     - `admin` (`admin_id`, `username`, `password_hash`, `created_at`)
     - `notices` (`notice_id`, `admin_id`, `title`, `description`, `category`, `created_at`, `expiry_date`, `status`)
   - 1:N relationship with Foreign Key enforcement (`admin_id REFERENCES admin(admin_id)`).
   - Automatic seeding with default admin account and sample institutional notices.

4. **Module 4: Notice Display (`/index.html`)**
   - Clean, modern card grid inspired by the presentation slide design.
   - Category badges (Academic, Events, Urgent, Facility, Seminars, Sports).
   - Relative posting time (`2h ago`, `3d ago`) and full dates.
   - Interactive modal viewer to read full announcements comfortably.

5. **Module 5: Search & Filter**
   - **Live Search**: Instant keyword filtering across title and description as you type.
   - **Date Filter**: Select any date to see notices posted on that day (`DATE(created_at) = ?`).
   - **Category Pills**: Filter by Academic, Event, Urgent, etc., with a single click.

---

## 🛠 Project Structure

```text
digital-notice-board/
├── db.js                 # SQLite database schema, foreign keys, & auto-seeding
├── server.js             # Express REST API, auth middleware, and static server
├── test-api.js           # Verification test script
├── notices.db            # SQLite database file (created automatically)
├── package.json          # Project metadata and dependencies
└── public/               # Frontend assets
    ├── index.html        # Public Visitor Board (Display + Search/Filter)
    ├── admin.html        # Admin Management Console (Login + Dashboard + CRUD)
    ├── styles.css        # Modern deep-navy theme, responsive CSS, cards & modals
    ├── app.js            # Visitor board frontend logic
    └── admin.js          # Admin dashboard frontend logic
```

---

## ⚡ How to Run

### 1. Start the server
Open your terminal in this directory and run:

```bash
npm start
```

### 2. Access the Application

- **Public Notice Board (Visitor View):**  
  [http://localhost:3000](http://localhost:3000)

- **Admin Management Portal:**  
  [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

### 3. Default Admin Credentials

- **Username:** `admin`
- **Password:** `admin123`

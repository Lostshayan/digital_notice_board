// Admin Portal Logic: Authentication, CRUD Management & Dashboard Stats

let currentNotices = [];
let noticeToDeleteId = null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const authNavSection = document.getElementById('authNavSection');
const currentAdminName = document.getElementById('currentAdminName');
const logoutBtn = document.getElementById('logoutBtn');

const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');

// Dashboard Elements
const statTotal = document.getElementById('statTotal');
const statPublished = document.getElementById('statPublished');
const statArchived = document.getElementById('statArchived');
const statExpiring = document.getElementById('statExpiring');
const adminNoticesTableBody = document.getElementById('adminNoticesTableBody');
const openCreateNoticeBtn = document.getElementById('openCreateNoticeBtn');

// Notice Form Modal
const noticeFormModal = document.getElementById('noticeFormModal');
const formModalTitle = document.getElementById('formModalTitle');
const noticeForm = document.getElementById('noticeForm');
const editNoticeId = document.getElementById('editNoticeId');
const formNoticeTitle = document.getElementById('formNoticeTitle');
const formNoticeCategory = document.getElementById('formNoticeCategory');
const formNoticeStatus = document.getElementById('formNoticeStatus');
const formNoticeExpiry = document.getElementById('formNoticeExpiry');
const formNoticeDesc = document.getElementById('formNoticeDesc');
const closeFormModalBtn = document.getElementById('closeFormModalBtn');
const cancelFormModalBtn = document.getElementById('cancelFormModalBtn');
const saveNoticeBtn = document.getElementById('saveNoticeBtn');

// Delete Confirm Modal
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteNoticeTitlePreview = document.getElementById('deleteNoticeTitlePreview');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✕'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// -------------------------------------------------------------
// AUTHENTICATION STATE
// -------------------------------------------------------------

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (data.authenticated && data.admin) {
      showDashboard(data.admin);
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  loginSection.style.display = 'block';
  dashboardSection.style.display = 'none';
  authNavSection.style.display = 'none';
  document.getElementById('username').focus();
}

function showDashboard(admin) {
  loginSection.style.display = 'none';
  dashboardSection.style.display = 'block';
  authNavSection.style.display = 'flex';
  currentAdminName.textContent = `Logged in as: ${admin.username}`;
  loadDashboardData();
}

// Login form submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginAlert.style.display = 'none';
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = 'Verifying...';

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast('Welcome back, ' + data.admin.username);
      showDashboard(data.admin);
    } else {
      loginAlert.textContent = data.error || 'Login failed. Please check your credentials.';
      loginAlert.style.display = 'block';
    }
  } catch (err) {
    loginAlert.textContent = 'Server connection error. Please try again.';
    loginAlert.style.display = 'block';
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = 'Sign In to Dashboard';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    showToast('Logged out successfully.');
    showLogin();
  } catch (err) {
    console.error('Logout error:', err);
  }
});

// -------------------------------------------------------------
// DASHBOARD & NOTICE MANAGEMENT
// -------------------------------------------------------------

async function loadDashboardData() {
  await Promise.all([fetchStats(), fetchAdminNotices()]);
}

async function fetchStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (data.success) {
      statTotal.textContent = data.stats.total;
      statPublished.textContent = data.stats.published;
      statArchived.textContent = data.stats.archived;
      statExpiring.textContent = data.stats.expiringSoon;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function fetchAdminNotices() {
  try {
    const res = await fetch('/api/admin/notices');
    const data = await res.json();

    if (data.success) {
      currentNotices = data.notices;
      renderAdminTable(currentNotices);
    }
  } catch (err) {
    console.error('Failed to load notices:', err);
  }
}

function renderAdminTable(notices) {
  if (!notices || notices.length === 0) {
    adminNoticesTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
          No notices found in database. Click "Post New Notice" to create one.
        </td>
      </tr>
    `;
    return;
  }

  adminNoticesTableBody.innerHTML = notices.map(n => {
    const isPublished = n.status === 'published';
    const statusBadgeClass = isPublished ? 'badge-status-published' : 'badge-status-archived';
    const statusLabel = isPublished ? 'Published' : 'Archived';

    return `
      <tr>
        <td style="color: var(--text-dim); font-family: monospace;">#${n.notice_id}</td>
        <td>
          <div style="font-weight: 600; color: #fff; margin-bottom: 0.25rem;">${escapeHtml(n.title)}</div>
          <span class="badge" style="background: rgba(56, 189, 248, 0.1); color: var(--accent-cyan); font-size: 0.7rem;">
            ${escapeHtml(n.category || 'General')}
          </span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDate(n.created_at)}</td>
        <td style="color: ${n.expiry_date ? 'var(--accent-amber)' : 'var(--text-dim)'}; font-size: 0.8rem;">
          ${formatDate(n.expiry_date)}
        </td>
        <td>
          <span class="badge ${statusBadgeClass}" style="cursor: pointer;" onclick="toggleNoticeStatus(${n.notice_id}, '${isPublished ? 'archived' : 'published'}')" title="Click to toggle status">
            ${statusLabel} ⇋
          </span>
        </td>
        <td style="text-align: right;">
          <div class="action-buttons" style="justify-content: flex-end;">
            <button class="btn btn-outline btn-sm" onclick="openEditNoticeModal(${n.notice_id})" title="Edit Notice">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn btn-danger btn-sm" onclick="openDeleteConfirm(${n.notice_id})" title="Delete Notice">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// CREATE / EDIT NOTICE MODAL
// -------------------------------------------------------------

openCreateNoticeBtn.addEventListener('click', () => {
  editNoticeId.value = '';
  formModalTitle.textContent = 'Post New Announcement';
  saveNoticeBtn.textContent = 'Save & Publish';
  noticeForm.reset();
  formNoticeStatus.value = 'published';
  noticeFormModal.classList.add('active');
  formNoticeTitle.focus();
});

function openEditNoticeModal(id) {
  const notice = currentNotices.find(n => n.notice_id === id);
  if (!notice) return;

  editNoticeId.value = notice.notice_id;
  formModalTitle.textContent = `Edit Notice #${notice.notice_id}`;
  saveNoticeBtn.textContent = 'Update Notice';

  formNoticeTitle.value = notice.title;
  formNoticeCategory.value = notice.category || 'General';
  formNoticeStatus.value = notice.status || 'published';
  formNoticeExpiry.value = notice.expiry_date || '';
  formNoticeDesc.value = notice.description;

  noticeFormModal.classList.add('active');
  formNoticeTitle.focus();
}

function closeFormModal() {
  noticeFormModal.classList.remove('active');
}

closeFormModalBtn.addEventListener('click', closeFormModal);
cancelFormModalBtn.addEventListener('click', closeFormModal);

noticeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  saveNoticeBtn.disabled = true;

  const id = editNoticeId.value;
  const isEdit = Boolean(id);

  const payload = {
    title: formNoticeTitle.value.trim(),
    category: formNoticeCategory.value,
    status: formNoticeStatus.value,
    expiry_date: formNoticeExpiry.value || null,
    description: formNoticeDesc.value.trim()
  };

  try {
    const url = isEdit ? `/api/admin/notices/${id}` : '/api/admin/notices';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showToast(isEdit ? 'Notice updated successfully.' : 'Notice published successfully.');
      closeFormModal();
      loadDashboardData();
    } else {
      showToast(data.error || 'Failed to save notice.', 'error');
    }
  } catch (err) {
    showToast('Server error while saving.', 'error');
  } finally {
    saveNoticeBtn.disabled = false;
  }
});

// -------------------------------------------------------------
// STATUS TOGGLE & DELETE
// -------------------------------------------------------------

async function toggleNoticeStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/notices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Notice status changed to ${newStatus}.`);
      loadDashboardData();
    } else {
      showToast(data.error || 'Failed to update status.', 'error');
    }
  } catch (err) {
    showToast('Network error while toggling status.', 'error');
  }
}

function openDeleteConfirm(id) {
  const notice = currentNotices.find(n => n.notice_id === id);
  if (!notice) return;
  noticeToDeleteId = id;
  deleteNoticeTitlePreview.textContent = `"${notice.title}"`;
  deleteConfirmModal.classList.add('active');
}

function closeDeleteModal() {
  deleteConfirmModal.classList.remove('active');
  noticeToDeleteId = null;
}

closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);

confirmDeleteBtn.addEventListener('click', async () => {
  if (!noticeToDeleteId) return;
  confirmDeleteBtn.disabled = true;

  try {
    const res = await fetch(`/api/admin/notices/${noticeToDeleteId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast('Notice permanently deleted.');
      closeDeleteModal();
      loadDashboardData();
    } else {
      showToast(data.error || 'Failed to delete notice.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting notice.', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
  }
});

// Close modals on outside click or ESC
[noticeFormModal, deleteConfirmModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    noticeFormModal.classList.remove('active');
    deleteConfirmModal.classList.remove('active');
  }
});

// Initialize
checkAuth();

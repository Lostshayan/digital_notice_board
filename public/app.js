// Visitor App Logic: Notice Board Display & Live Filtering

let activeCategory = 'All';
let searchDebounceTimer = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const dateFilter = document.getElementById('dateFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const categoryChips = document.getElementById('categoryChips');
const noticesContainer = document.getElementById('noticesContainer');
const resultsCount = document.getElementById('resultsCount');

// Modal Elements
const noticeModal = document.getElementById('noticeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalFooterBtn = document.getElementById('closeModalFooterBtn');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalCategoryBadge = document.getElementById('modalCategoryBadge');
const modalDate = document.getElementById('modalDate');
const modalAuthor = document.getElementById('modalAuthor');
const modalExpiry = document.getElementById('modalExpiry');

// Live Header Clock
function updateClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' · ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// Format date nicely
function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Relative time format
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateString);
}

// Map category to CSS class
function getCategoryBadgeClass(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('urgent')) return 'badge-urgent';
  if (cat.includes('academic') || cat.includes('exam')) return 'badge-academic';
  if (cat.includes('event')) return 'badge-event';
  if (cat.includes('facility') || cat.includes('infra')) return 'badge-facility';
  return 'badge-general';
}

// Fetch notices from the server with filters
async function fetchNotices() {
  const searchVal = searchInput.value.trim();
  const dateVal = dateFilter.value;

  const params = new URLSearchParams();
  if (searchVal) params.append('search', searchVal);
  if (dateVal) params.append('date', dateVal);
  if (activeCategory && activeCategory !== 'All') params.append('category', activeCategory);

  try {
    const res = await fetch(`/api/notices?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      renderNotices(data.notices);
      resultsCount.textContent = `Showing ${data.notices.length} published announcement${data.notices.length === 1 ? '' : 's'}`;
    } else {
      resultsCount.textContent = 'Failed to load notices';
    }
  } catch (err) {
    console.error('Error fetching notices:', err);
    resultsCount.textContent = 'Server connection error';
    noticesContainer.innerHTML = `
      <div class="empty-state">
        <h3>Could not load notices</h3>
        <p>Please check your connection and refresh the page.</p>
      </div>
    `;
  }
}

// Render cards into grid
function renderNotices(notices) {
  if (!notices || notices.length === 0) {
    noticesContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>No matching notices found</h3>
        <p>Try clearing your search query or selecting another category.</p>
      </div>
    `;
    return;
  }

  noticesContainer.innerHTML = notices.map(notice => {
    const catClass = getCategoryBadgeClass(notice.category);
    const cardCatType = (notice.category || '').toLowerCase();

    return `
      <article class="notice-card ${cardCatType}">
        <div>
          <div class="notice-header">
            <span class="badge ${catClass}">${escapeHtml(notice.category || 'General')}</span>
            <div class="notice-date" title="Published ${formatDate(notice.created_at)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${timeAgo(notice.created_at)}
            </div>
          </div>
          <h3 class="notice-title">${escapeHtml(notice.title)}</h3>
          <p class="notice-desc">${escapeHtml(notice.description)}</p>
        </div>

        <div class="notice-footer">
          <span class="notice-author">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            ${escapeHtml(notice.author || 'Admin')}
          </span>
          <button class="read-more-link" onclick="openNoticeModal(${notice.notice_id})">
            Read notice →
          </button>
        </div>
      </article>
    `;
  }).join('');
}

// Open notice modal with full detail
async function openNoticeModal(id) {
  try {
    const res = await fetch(`/api/notices/${id}`);
    const data = await res.json();
    if (!data.success || !data.notice) return;

    const n = data.notice;
    modalTitle.textContent = n.title;
    modalDescription.textContent = n.description;

    modalCategoryBadge.className = `badge ${getCategoryBadgeClass(n.category)}`;
    modalCategoryBadge.textContent = n.category || 'General';

    modalDate.innerHTML = `<strong>Posted:</strong> ${formatDate(n.created_at)}`;
    modalAuthor.innerHTML = `<strong>By:</strong> ${n.author || 'Administrator'}`;

    if (n.expiry_date) {
      modalExpiry.innerHTML = `<strong>Valid until:</strong> ${formatDate(n.expiry_date)}`;
      modalExpiry.style.display = 'inline';
    } else {
      modalExpiry.style.display = 'none';
    }

    noticeModal.classList.add('active');
  } catch (err) {
    console.error('Error fetching notice details:', err);
  }
}

// Close notice modal
function closeNoticeModal() {
  noticeModal.classList.remove('active');
}

// Helper: Escape HTML to avoid XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Event Listeners
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(fetchNotices, 250);
});

dateFilter.addEventListener('change', fetchNotices);

resetFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  dateFilter.value = '';
  activeCategory = 'All';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip[data-category="All"]').classList.add('active');
  fetchNotices();
});

categoryChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeCategory = chip.dataset.category;
  fetchNotices();
});

closeModalBtn.addEventListener('click', closeNoticeModal);
closeModalFooterBtn.addEventListener('click', closeNoticeModal);
noticeModal.addEventListener('click', (e) => {
  if (e.target === noticeModal) closeNoticeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNoticeModal();
});

// Initial load
fetchNotices();

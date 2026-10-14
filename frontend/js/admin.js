/**
 * ==========================================================================
 * F-TECH-Student-Hub Admin Logic & Governance
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

// Safe HTML escape helper fallback
if (typeof FTechApp !== 'undefined' && !FTechApp.escapeHtml) {
  FTechApp.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}

// Cache for in-memory filtering
let cachedDocs = [];
let cachedSubjects = [];
let cachedTutorials = [];
let cachedLabs = [];
let cachedCommunity = [];
let cachedUsers = [];
let cachedDownloadLogs = [];

// Safely decode base64 JWT payload in browser
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Check if JWT token has expired or is invalid
function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  // exp timestamp is in seconds, Date.now() is in milliseconds.
  // Add 10-second margin against network latency
  return payload.exp * 1000 <= (Date.now() + 10000);
}

// Clear all administrator and user credentials from browser storage
function clearAdminSession() {
  localStorage.removeItem('ftech_admin_token');
  localStorage.removeItem('ftech_admin_user');
  localStorage.removeItem('ftech_token');
  localStorage.removeItem('ftech_user');
}

// Admin Login
async function handleAdminLogin(event) {
  event.preventDefault();
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const loginBtn = document.getElementById('adminLoginBtn');

  if (!username || !password) {
    FTechApp.showToast('Please enter both username and password', 'error');
    return;
  }

  // Purge any stale tokens before signing in
  clearAdminSession();

  loginBtn.disabled = true;
  loginBtn.textContent = 'Verifying credentials...';

  const res = await FTechApp.apiCall('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (res.success && res.token) {
    localStorage.setItem('ftech_admin_token', res.token);
    localStorage.setItem('ftech_admin_user', JSON.stringify(res.admin));
    localStorage.setItem('ftech_user', JSON.stringify({ fullName: res.admin.fullName, role: 'SuperAdmin', isAdmin: true }));
    localStorage.setItem('ftech_token', res.token);
    FTechApp.showToast(`Welcome Administrator, ${res.admin.fullName}!`, 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  } else {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In to F-TECH Admin';
    FTechApp.showToast(res.message || 'Invalid admin credentials', 'error');
  }
}

// Check admin auth state and validate token freshness
function checkAdminAuth() {
  const adminToken = localStorage.getItem('ftech_admin_token') || localStorage.getItem('ftech_token');
  const user = JSON.parse(localStorage.getItem('ftech_user') || '{}');
  const adminUser = JSON.parse(localStorage.getItem('ftech_admin_user') || '{}');

  const role = ((user.role || '') + ' ' + (adminUser.role || '')).toLowerCase();
  const isAdmin = role.includes('admin') || user.isAdmin === true || adminUser.isAdmin === true;

  // 1. Missing credentials or not admin role
  if (!adminToken || !isAdmin) {
    clearAdminSession();
    FTechApp.showToast('Administrator privileges required. Please sign in with your Admin ID.', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
    return false;
  }

  // 2. Client-side JWT expiration check
  if (isTokenExpired(adminToken)) {
    console.warn('[F-TECH Admin Auth] Token expired or invalid signature detected. Clearing session.');
    clearAdminSession();
    FTechApp.showToast('Administrator session has expired. Please sign in again.', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
    return false;
  }

  return true;
}

// Logout
function adminLogout() {
  clearAdminSession();
  FTechApp.showToast('Logged out from F-TECH Admin Command', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

// Tab Switching
function switchAdminTab(tabKey) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.remove('active'));

  const targetPane = document.getElementById(`tab-${tabKey}`);
  if (targetPane) targetPane.classList.add('active');

  const activeBtn = Array.from(document.querySelectorAll('.admin-tab-btn')).find(b => b.getAttribute('onclick')?.includes(`'${tabKey}'`));
  if (activeBtn) activeBtn.classList.add('active');

  if (tabKey === 'documents') loadAdminDocumentsTable();
  if (tabKey === 'subjects') loadAdminSubjectsTable();
  if (tabKey === 'subsubjects') loadAdminSubsubjectsTable();
  if (tabKey === 'live-tracking') loadLiveTrackingData();
  if (tabKey === 'tutorials') loadAdminTutorialsTable();
  if (tabKey === 'labs') loadAdminLabsTable();
  if (tabKey === 'community') loadAdminCommunityTable();
  if (tabKey === 'users') loadAdminUsersTable();
  if (tabKey === 'downloads') loadAdminDownloadLogsTable();
}

// Load Dashboard Top Stats
async function loadAdminDashboard() {
  if (!checkAdminAuth()) return;

  const user = JSON.parse(localStorage.getItem('ftech_admin_user') || localStorage.getItem('ftech_user') || '{}');
  const adminNameEl = document.getElementById('adminDisplayName');
  if (adminNameEl) {
    adminNameEl.textContent = user.fullName || user.name || 'Aditya Kumar Sharma';
  }

  const statsRes = await FTechApp.apiCall('/api/admin/stats');
  if (statsRes.success && statsRes.stats) {
    const s = statsRes.stats;
    if (document.getElementById('statTotalDocs')) document.getElementById('statTotalDocs').textContent = s.documentsCount ?? 0;
    if (document.getElementById('statTotalDownloads')) document.getElementById('statTotalDownloads').textContent = (s.totalDownloads ?? 0).toLocaleString();
    if (document.getElementById('statLikesDislikes')) document.getElementById('statLikesDislikes').textContent = `${s.totalLikes ?? 0} 👍 / ${s.totalDislikes ?? 0} 👎`;
    if (document.getElementById('statTotalSubjects')) document.getElementById('statTotalSubjects').textContent = s.subjectsCount ?? 0;

    if (document.getElementById('badgeDocsCount')) document.getElementById('badgeDocsCount').textContent = s.documentsCount ?? 0;
    if (document.getElementById('badgeSubsCount')) document.getElementById('badgeSubsCount').textContent = s.subjectsCount ?? 0;
    if (document.getElementById('badgeTutorialsCount')) document.getElementById('badgeTutorialsCount').textContent = s.tutorialsCount ?? 0;
    if (document.getElementById('badgeLabsCount')) document.getElementById('badgeLabsCount').textContent = s.labsCount ?? 0;
    if (document.getElementById('badgePostsCount')) document.getElementById('badgePostsCount').textContent = s.postsCount ?? 0;
    if (document.getElementById('badgeUsersCount')) document.getElementById('badgeUsersCount').textContent = s.usersCount ?? 0;
  }

  // Load initial tab
  loadAdminDocumentsTable();
}

// --------------------------------------------------------------------------
// 1. DOCUMENTS TABLE
// --------------------------------------------------------------------------
async function loadAdminDocumentsTable() {
  const tableBody = document.getElementById('adminDocTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">Loading documents...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/documents');
  if (res.success && res.data) {
    cachedDocs = res.data;
    if (document.getElementById('badgeDocsCount')) document.getElementById('badgeDocsCount').textContent = cachedDocs.length;
    renderAdminDocsTable(cachedDocs);
  } else {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color:var(--accent-rose);">${res.message || 'Failed to load documents'}</td></tr>`;
  }
}

function renderAdminDocsTable(docs) {
  const tableBody = document.getElementById('adminDocTableBody');
  if (!tableBody) return;

  if (docs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No documents match current criteria.</td></tr>`;
    return;
  }

  tableBody.innerHTML = docs.map(doc => {
    const isApproved = doc.is_approved === 1 || doc.is_approved === true;
    return `
      <tr>
        <td>
          <strong>${FTechApp.escapeHtml(doc.title)}</strong>
          <div style="font-size:0.75rem; color:var(--text-dim);">${FTechApp.escapeHtml(doc.file_name || 'ftech-file.pdf')}</div>
        </td>
        <td><span class="card-code">${FTechApp.escapeHtml(doc.subject_code || 'GEN')}</span></td>
        <td>Sem ${doc.semester} (${doc.branch})</td>
        <td>
          <span class="badge-tag ${doc.type === 'aktu-paper' ? 'badge-aktu' : 'badge-notes'}">
            ${doc.type}
          </span>
        </td>
        <td><strong>${doc.downloads_count || 0}</strong></td>
        <td>
          <span style="color:#10b981; font-weight:600;">+${doc.likes_count || 0}</span> / 
          <span style="color:#f43f5e; font-weight:600;">-${doc.dislikes_count || 0}</span>
        </td>
        <td>
          <span class="status-badge ${isApproved ? 'status-approved' : 'status-blocked'}">
            ${isApproved ? 'Active' : 'Blocked'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button onclick="openEditDocModal(${doc.id})" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.5rem;" title="Edit Material">
              ✏️ Edit
            </button>
            <button onclick="toggleDocBlock(${doc.id}, ${isApproved ? 1 : 0})" class="${isApproved ? 'btn-icon-warning' : 'btn-icon-success'}" title="${isApproved ? 'Block Document' : 'Unblock / Approve'}">
              ${isApproved ? '🔒 Block' : '🔓 Unblock'}
            </button>
            <button onclick="deleteDocAdmin(${doc.id})" class="btn-icon-danger" title="Permanently Delete">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminDocs() {
  const typeVal = document.getElementById('docFilterType')?.value || '';
  const semVal = document.getElementById('docFilterSem')?.value || '';
  const searchVal = document.getElementById('docSearchInput')?.value.toLowerCase().trim() || '';

  const filtered = cachedDocs.filter(d => {
    if (typeVal && d.type !== typeVal) return false;
    if (semVal && d.semester !== parseInt(semVal, 10)) return false;
    if (searchVal) {
      const matchTitle = (d.title || '').toLowerCase().includes(searchVal);
      const matchCode = (d.subject_code || '').toLowerCase().includes(searchVal);
      if (!matchTitle && !matchCode) return false;
    }
    return true;
  });

  renderAdminDocsTable(filtered);
}

async function toggleDocBlock(id, currentApproved) {
  const newApproved = currentApproved === 1 ? 0 : 1;
  const res = await FTechApp.apiCall(`/api/admin/documents/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_approved: newApproved })
  });

  if (res.success) {
    FTechApp.showToast(res.message, 'success');
    loadAdminDocumentsTable();
  } else {
    FTechApp.showToast(res.message || 'Action failed', 'error');
  }
}

async function deleteDocAdmin(id) {
  if (!confirm('Are you sure you want to permanently delete this material from F-TECH servers?')) {
    return;
  }

  const res = await FTechApp.apiCall(`/api/admin/documents/${id}`, {
    method: 'DELETE'
  });

  if (res.success) {
    FTechApp.showToast('Document deleted permanently', 'success');
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res.message || 'Failed to delete', 'error');
  }
}

// --------------------------------------------------------------------------
// 2. SUBJECTS TABLE, SEMESTERS CONFIGURATION & OFFICIAL SYLLABUS
// --------------------------------------------------------------------------
let adminConfiguredMaxSemesters = 8;

async function loadAdminSubjectsTable() {
  const tableBody = document.getElementById('adminSubjectTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">Loading subjects...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/subjects');
  if (res.success && res.data) {
    cachedSubjects = res.data;
    if (res.max_semesters) {
      adminConfiguredMaxSemesters = res.max_semesters;
      const semInput = document.getElementById('adminMaxSemInput');
      if (semInput) semInput.value = res.max_semesters;
      populateAdminSemesterDropdowns(res.max_semesters);
    }
    if (document.getElementById('badgeSubsCount')) document.getElementById('badgeSubsCount').textContent = cachedSubjects.length;
    renderAdminSubjectsTable(cachedSubjects);
  } else {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color:var(--accent-rose);">${res.message || 'Failed to load subjects'}</td></tr>`;
  }
}

function populateAdminSemesterDropdowns(maxSem) {
  const filterSem = document.getElementById('subFilterSem');
  if (filterSem) {
    const cur = filterSem.value;
    let html = '<option value="">All Semesters</option>';
    for (let i = 1; i <= maxSem; i++) {
      html += `<option value="${i}">Semester ${i}</option>`;
    }
    filterSem.innerHTML = html;
    if (cur && parseInt(cur, 10) <= maxSem) filterSem.value = cur;
  }

  const uploadSem = document.getElementById('uploadSemester');
  if (uploadSem) {
    const cur = uploadSem.value;
    let html = '';
    for (let i = 1; i <= maxSem; i++) {
      html += `<option value="${i}" ${i === 3 ? 'selected' : ''}>Semester ${i}</option>`;
    }
    uploadSem.innerHTML = html;
    if (cur && parseInt(cur, 10) <= maxSem) uploadSem.value = cur;
  }
}

async function saveAdminMaxSemesters() {
  const input = document.getElementById('adminMaxSemInput');
  if (!input) return;

  const num = parseInt(input.value, 10);
  if (isNaN(num) || num < 1 || num > 20) {
    FTechApp.showToast('Please enter a valid semester number between 1 and 20.', 'error');
    return;
  }

  const res = await FTechApp.apiCall('/api/admin/semesters', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_semesters: num })
  });

  if (res.success) {
    FTechApp.showToast(`Total academic semesters updated to ${num} successfully!`, 'success');
    loadAdminSubjectsTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to update semesters', 'error');
  }
}

function renderAdminSubjectsTable(subjects) {
  const tableBody = document.getElementById('adminSubjectTableBody');
  if (!tableBody) return;

  if (subjects.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No subjects found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = subjects.map(s => {
    const hasSyllabus = s.syllabus_id;
    const isDocx = (s.syllabus_file_name || '').toLowerCase().endsWith('.docx') || (s.syllabus_file_name || '').toLowerCase().endsWith('.doc');

    let syllabusHtml = '';
    if (hasSyllabus) {
      syllabusHtml = `
        <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
          <a href="/api/documents/${s.syllabus_id}/download" class="badge-tag" style="background:${isDocx ? 'rgba(56,189,248,0.15)' : 'rgba(248,113,113,0.15)'}; color:${isDocx ? '#38bdf8' : '#f87171'}; border:1px solid ${isDocx ? 'rgba(56,189,248,0.3)' : 'rgba(248,113,113,0.3)'}; font-weight:700; text-decoration:none;" title="Download Syllabus">
            ${isDocx ? '📄 DOCX' : '📕 PDF'}
          </a>
          <button onclick="openAdminSyllabusModal('${FTechApp.escapeHtml(s.code)}', ${s.semester}, '${FTechApp.escapeHtml(s.title)}')" class="btn btn-secondary btn-sm" style="font-size:0.72rem; padding:0.2rem 0.45rem;" title="Replace Syllabus File">
            Change
          </button>
        </div>
      `;
    } else {
      syllabusHtml = `
        <button onclick="openAdminSyllabusModal('${FTechApp.escapeHtml(s.code)}', ${s.semester}, '${FTechApp.escapeHtml(s.title)}')" class="btn btn-primary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.6rem;">
          + Upload (DOCX/PDF)
        </button>
      `;
    }

    return `
      <tr>
        <td><span class="card-code">${FTechApp.escapeHtml(s.code)}</span></td>
        <td>
          <strong>${FTechApp.escapeHtml(s.title)}</strong>
          ${s.description ? `<div style="font-size:0.75rem; color:var(--text-muted); max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${FTechApp.escapeHtml(s.description)}</div>` : ''}
        </td>
        <td>${FTechApp.escapeHtml(s.branch)}</td>
        <td>Semester ${s.semester}</td>
        <td>${s.credits} Credits</td>
        <td>${syllabusHtml}</td>
        <td><span class="badge-tag badge-aktu">${s.doc_count || 0} Docs</span></td>
        <td>
          <div style="display:flex; gap:0.35rem; align-items:center;">
            <button onclick="openEditSubjectModal(${s.id})" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.5rem;" title="Edit Subject Details">
              ✏️ Edit
            </button>
            <button onclick="filterSubsubjectsByCode('${FTechApp.escapeHtml(s.code)}')" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.5rem;" title="Manage 5 Modules / Units">
              📑 Units
            </button>
            <button onclick="deleteSubjectAdmin(${s.id}, '${FTechApp.escapeHtml(s.code)}', '${FTechApp.escapeHtml(s.title)}')" class="btn-icon-danger" title="Delete Subject">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminSubjects() {
  const semVal = document.getElementById('subFilterSem')?.value || '';
  const searchVal = document.getElementById('subSearchInput')?.value.toLowerCase().trim() || '';

  const filtered = cachedSubjects.filter(s => {
    if (semVal && s.semester !== parseInt(semVal, 10)) return false;
    if (searchVal) {
      const matchCode = (s.code || '').toLowerCase().includes(searchVal);
      const matchTitle = (s.title || '').toLowerCase().includes(searchVal);
      if (!matchCode && !matchTitle) return false;
    }
    return true;
  });

  renderAdminSubjectsTable(filtered);
}

async function deleteSubjectAdmin(id, code, title) {
  if (!confirm(`Are you sure you want to delete subject "${code} - ${title}" from F-TECH Student-Hub?\nThis will remove the curriculum and unlink materials.`)) {
    return;
  }

  const res = await FTechApp.apiCall(`/api/admin/subjects/${id}`, {
    method: 'DELETE'
  });

  if (res.success) {
    FTechApp.showToast(`Subject ${code} deleted successfully`, 'success');
    loadAdminDashboard();
    loadAdminSubjectsTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to delete subject', 'error');
  }
}

async function handleCreateSubject(e) {
  e.preventDefault();
  const code = document.getElementById('subCodeInput').value.trim();
  const title = document.getElementById('subTitleInput').value.trim();
  const semester = document.getElementById('subSemInput').value;
  const branch = document.getElementById('subBranchInput').value;
  const credits = document.getElementById('subCreditsInput').value;
  const description = document.getElementById('subDescInput').value.trim();

  const res = await FTechApp.apiCall('/api/admin/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, title, semester, branch, credits, description })
  });

  if (res.success) {
    FTechApp.showToast(`Subject ${code} added successfully!`, 'success');
    document.getElementById('createSubjectForm').reset();
    document.getElementById('subjectModal')?.classList.remove('active');
    loadAdminDashboard();
    loadAdminSubjectsTable();
  } else {
    FTechApp.showToast(res.message || 'Creation failed', 'error');
  }
}

// --------------------------------------------------------------------------
// 2B. VIDEO TUTORIALS & PLAYLISTS
// --------------------------------------------------------------------------
async function loadAdminTutorialsTable() {
  const tableBody = document.getElementById('adminTutorialTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading video tutorials...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/tutorials');
  if (res.success && res.data) {
    cachedTutorials = res.data;
    if (document.getElementById('badgeTutorialsCount')) {
      document.getElementById('badgeTutorialsCount').textContent = cachedTutorials.length;
    }
    renderAdminTutorialsTable(cachedTutorials);
  } else {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color:var(--accent-rose);">${res.message || 'Failed to load tutorials'}</td></tr>`;
  }
}

function renderAdminTutorialsTable(tutorials) {
  const tableBody = document.getElementById('adminTutorialTableBody');
  if (!tableBody) return;

  if (tutorials.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No video tutorials found. Click "+ Add Tutorial" to create one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = tutorials.map(tut => `
    <tr>
      <td>
        <strong>${FTechApp.escapeHtml(tut.title)}</strong>
        <div style="font-size:0.75rem; color:var(--text-dim); max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${FTechApp.escapeHtml(tut.description || '')}
        </div>
      </td>
      <td>
        <span class="card-code">${FTechApp.escapeHtml(tut.subject_code)}</span>
        <div style="font-size:0.75rem; color:var(--text-muted);">${FTechApp.escapeHtml(tut.subject_title || '')}</div>
      </td>
      <td>Sem ${tut.semester}</td>
      <td><span class="badge-tag badge-sem">${tut.video_count || 1} Videos</span></td>
      <td><span style="font-size:0.85rem; color:var(--text-muted);">${FTechApp.escapeHtml(tut.instructor || 'F-TECH')}</span></td>
      <td>
        <a href="${FTechApp.escapeHtml(tut.video_url)}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.6rem;">
          ▶ View Link
        </a>
      </td>
      <td>
        <div class="action-buttons">
          <button onclick="openEditTutorialModal(${tut.id})" class="btn-icon-warning" title="Edit Tutorial">
            ✏️ Edit
          </button>
          <button onclick="deleteTutorialAdmin(${tut.id}, '${FTechApp.escapeHtml(tut.title).replace(/'/g, "\\'")}')" class="btn-icon-danger" title="Delete Tutorial">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateTutorialModal() {
  document.getElementById('tutorialForm').reset();
  document.getElementById('tutEditId').value = '';
  document.getElementById('tutorialModalTitle').textContent = 'Add Video Tutorial';
  document.getElementById('saveTutorialBtn').textContent = 'Create Tutorial in F-TECH';
  document.getElementById('tutorialModal')?.classList.add('active');
}

function openEditTutorialModal(id) {
  const tut = cachedTutorials.find(t => t.id === id);
  if (!tut) return;

  document.getElementById('tutEditId').value = tut.id;
  document.getElementById('tutTitleInput').value = tut.title || '';
  document.getElementById('tutSubCodeInput').value = tut.subject_code || '';
  document.getElementById('tutSubTitleInput').value = tut.subject_title || '';
  document.getElementById('tutSemesterInput').value = tut.semester || 1;
  document.getElementById('tutVideoCountInput').value = tut.video_count || 10;
  document.getElementById('tutInstructorInput').value = tut.instructor || '';
  document.getElementById('tutUrlInput').value = tut.video_url || '';
  document.getElementById('tutDescInput').value = tut.description || '';

  document.getElementById('tutorialModalTitle').textContent = 'Edit Video Tutorial';
  document.getElementById('saveTutorialBtn').textContent = 'Update Tutorial';
  document.getElementById('tutorialModal')?.classList.add('active');
}

function closeTutorialModal() {
  document.getElementById('tutorialModal')?.classList.remove('active');
}

async function handleSaveTutorial(e) {
  e.preventDefault();
  const editId = document.getElementById('tutEditId').value;
  const title = document.getElementById('tutTitleInput').value.trim();
  const subject_code = document.getElementById('tutSubCodeInput').value.trim();
  const subject_title = document.getElementById('tutSubTitleInput').value.trim();
  const semester = document.getElementById('tutSemesterInput').value;
  const video_count = document.getElementById('tutVideoCountInput').value;
  const instructor = document.getElementById('tutInstructorInput').value.trim();
  const video_url = document.getElementById('tutUrlInput').value.trim();
  const description = document.getElementById('tutDescInput').value.trim();

  const payload = { title, subject_code, subject_title, semester, video_count, instructor, video_url, description };

  let res;
  if (editId) {
    res = await FTechApp.apiCall(`/api/admin/tutorials/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } else {
    res = await FTechApp.apiCall('/api/admin/tutorials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  if (res.success) {
    FTechApp.showToast(res.message || 'Tutorial saved successfully!', 'success');
    closeTutorialModal();
    loadAdminDashboard();
    loadAdminTutorialsTable();
  } else {
    FTechApp.showToast(res.message || 'Operation failed', 'error');
  }
}

async function deleteTutorialAdmin(id, title) {
  if (!confirm(`Are you sure you want to delete tutorial "${title}"?`)) return;

  const res = await FTechApp.apiCall(`/api/admin/tutorials/${id}`, { method: 'DELETE' });
  if (res.success) {
    FTechApp.showToast(res.message, 'success');
    loadAdminDashboard();
    loadAdminTutorialsTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to delete tutorial', 'error');
  }
}

// --------------------------------------------------------------------------
// 3. LAB EXPERIMENTS
// --------------------------------------------------------------------------
async function loadAdminLabsTable() {
  const tableBody = document.getElementById('adminLabTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Loading lab experiments...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/labs');
  if (res.success && res.data) {
    cachedLabs = res.data;
    if (document.getElementById('badgeLabsCount')) document.getElementById('badgeLabsCount').textContent = cachedLabs.length;

    if (cachedLabs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No lab experiments found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = cachedLabs.map(lab => `
      <tr>
        <td><span class="card-code">${FTechApp.escapeHtml(lab.subject_code)}</span></td>
        <td><strong>Exp #${lab.exp_no}</strong></td>
        <td><strong>${FTechApp.escapeHtml(lab.title)}</strong></td>
        <td><span class="badge-tag badge-notes">${FTechApp.escapeHtml(lab.language)}</span></td>
        <td>
          <div style="font-size:0.8rem; color:var(--text-muted); max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${FTechApp.escapeHtml(lab.objective)}
          </div>
        </td>
        <td>
          <div style="display:flex; gap:0.35rem; align-items:center;">
            <button onclick="openEditLabModal(${lab.id})" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.5rem;" title="Edit Lab Experiment">
              ✏️ Edit
            </button>
            <button onclick="deleteLabAdmin(${lab.id}, '${FTechApp.escapeHtml(lab.title)}')" class="btn-icon-danger" title="Delete Lab Experiment">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

async function handleCreateLab(e) {
  e.preventDefault();
  const subject_code = document.getElementById('labSubCodeInput').value.trim();
  const exp_no = document.getElementById('labExpNoInput').value;
  const title = document.getElementById('labTitleInput').value.trim();
  const language = document.getElementById('labLangInput').value.trim();
  const objective = document.getElementById('labObjectiveInput').value.trim();
  const code = document.getElementById('labCodeInput').value;
  const output_sample = document.getElementById('labOutputInput').value.trim();

  const res = await FTechApp.apiCall('/api/admin/labs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject_code, exp_no, title, language, objective, code, output_sample })
  });

  if (res.success) {
    FTechApp.showToast('Lab experiment added!', 'success');
    document.getElementById('createLabForm').reset();
    document.getElementById('labModal')?.classList.remove('active');
    loadAdminLabsTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to add lab experiment', 'error');
  }
}

async function deleteLabAdmin(id, title) {
  if (!confirm(`Delete lab experiment "${title}"?`)) return;

  const res = await FTechApp.apiCall(`/api/admin/labs/${id}`, { method: 'DELETE' });
  if (res.success) {
    FTechApp.showToast('Lab experiment deleted', 'success');
    loadAdminLabsTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to delete lab', 'error');
  }
}

// --------------------------------------------------------------------------
// 4. COMMUNITY FORUM MODERATION
// --------------------------------------------------------------------------
async function loadAdminCommunityTable() {
  const tableBody = document.getElementById('adminCommunityTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading community discussions...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/community/posts');
  if (res.success && res.data) {
    cachedCommunity = res.data;
    if (document.getElementById('badgePostsCount')) document.getElementById('badgePostsCount').textContent = cachedCommunity.length;

    if (cachedCommunity.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No community discussions found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = cachedCommunity.map(p => `
      <tr>
        <td>
          <strong>${FTechApp.escapeHtml(p.title)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted); max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${FTechApp.escapeHtml(p.content)}
          </div>
        </td>
        <td>
          <div>${FTechApp.escapeHtml(p.author_name)}</div>
          <span class="badge-tag badge-aktu" style="font-size:0.7rem;">${p.author_badge}</span>
        </td>
        <td><span style="font-size:0.75rem; color:var(--text-dim);">${FTechApp.escapeHtml(p.tags)}</span></td>
        <td>
          <span style="color:#10b981; font-weight:600;">+${p.upvotes || 0}</span> / 
          <span style="color:#f43f5e; font-weight:600;">-${p.downvotes || 0}</span>
        </td>
        <td><strong>${p.actual_answers_count || p.answers_count || 0}</strong></td>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
        <td>
          <button onclick="deleteCommunityPostAdmin(${p.id}, '${FTechApp.escapeHtml(p.title)}')" class="btn-icon-danger" title="Delete Question & Replies">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </td>
      </tr>
    `).join('');
  }
}

async function deleteCommunityPostAdmin(id, title) {
  if (!confirm(`Delete discussion question "${title}" and all its replies?`)) return;

  const res = await FTechApp.apiCall(`/api/admin/community/posts/${id}`, { method: 'DELETE' });
  if (res.success) {
    FTechApp.showToast('Discussion removed from community forum', 'success');
    loadAdminCommunityTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to delete discussion', 'error');
  }
}

// --------------------------------------------------------------------------
// 5. USERS & MEMBERS MANAGEMENT
// --------------------------------------------------------------------------
async function loadAdminUsersTable() {
  const tableBody = document.getElementById('adminUsersTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading registered users...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/users');
  if (res.success && res.data) {
    cachedUsers = res.data;
    if (document.getElementById('badgeUsersCount')) document.getElementById('badgeUsersCount').textContent = cachedUsers.length;

    if (cachedUsers.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No users found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = cachedUsers.map(u => {
      const isBlocked = u.is_blocked === 1;
      return `
        <tr>
          <td><strong>${FTechApp.escapeHtml(u.full_name)}</strong></td>
          <td><code>${FTechApp.escapeHtml(u.email)}</code></td>
          <td>${u.branch} - Sem ${u.semester}</td>
          <td><span class="badge-tag badge-notes">${u.role}</span></td>
          <td><strong>${u.download_activity || 0}</strong> downloads</td>
          <td>
            <span class="status-badge ${isBlocked ? 'status-blocked' : 'status-approved'}">
              ${isBlocked ? 'Blocked' : 'Active'}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              <button onclick="toggleUserBlockAdmin(${u.id}, '${FTechApp.escapeHtml(u.full_name)}')" class="${isBlocked ? 'btn-icon-success' : 'btn-icon-warning'}">
                ${isBlocked ? '🔓 Unblock' : '🔒 Block'}
              </button>
              <button onclick="deleteUserAdmin(${u.id}, '${FTechApp.escapeHtml(u.email)}')" class="btn-icon-danger" title="Delete User">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleUserBlockAdmin(id, name) {
  const res = await FTechApp.apiCall(`/api/admin/users/${id}/block`, { method: 'PUT' });
  if (res.success) {
    FTechApp.showToast(res.message, 'success');
    loadAdminUsersTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to toggle status', 'error');
  }
}

async function deleteUserAdmin(id, email) {
  if (!confirm(`Permanently delete account for "${email}"?`)) return;

  const res = await FTechApp.apiCall(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (res.success) {
    FTechApp.showToast('User account deleted', 'success');
    loadAdminUsersTable();
  } else {
    FTechApp.showToast(res.message || 'Failed to delete user', 'error');
  }
}

// --------------------------------------------------------------------------
// 6. DOWNLOAD LOGS & AUDIT TRAIL
// --------------------------------------------------------------------------
async function loadAdminDownloadLogsTable() {
  const tableBody = document.getElementById('adminDownloadLogsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Loading download history...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/downloads/logs');
  if (res.success && res.data) {
    cachedDownloadLogs = res.data;
    renderDownloadLogsTable(cachedDownloadLogs);
  } else {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color:var(--accent-rose);">${res.message || 'Failed to load download logs'}</td></tr>`;
  }
}

function renderDownloadLogsTable(logs) {
  const tableBody = document.getElementById('adminDownloadLogsTableBody');
  if (!tableBody) return;

  if (logs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No downloads recorded yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = logs.map(log => `
    <tr>
      <td>
        <strong>${FTechApp.escapeHtml(log.doc_title || 'Document #' + log.doc_id)}</strong>
        <div style="font-size:0.75rem; color:var(--text-dim);">${FTechApp.escapeHtml(log.subject_code || '')} • ${log.doc_type || 'material'}</div>
      </td>
      <td><strong>${FTechApp.escapeHtml(log.user_name || 'Guest Student')}</strong></td>
      <td><code>${FTechApp.escapeHtml(log.user_email || 'guest@anonymous')}</code></td>
      <td><span style="font-family:'JetBrains Mono',monospace; font-size:0.8rem;">${FTechApp.escapeHtml(log.ip_address || '127.0.0.1')}</span></td>
      <td>${new Date(log.downloaded_at).toLocaleString()}</td>
      <td>
        <span style="color:#10b981; font-weight:600;">${log.downloads_count || 1} dl</span> • 
        <span style="color:#38bdf8;">+${log.likes_count || 0}</span> / 
        <span style="color:#f43f5e;">-${log.dislikes_count || 0}</span>
      </td>
    </tr>
  `).join('');
}

function filterDownloadLogs() {
  const query = document.getElementById('downloadSearchInput')?.value.toLowerCase().trim() || '';
  if (!query) {
    renderDownloadLogsTable(cachedDownloadLogs);
    return;
  }

  const filtered = cachedDownloadLogs.filter(l => {
    const matchEmail = (l.user_email || '').toLowerCase().includes(query);
    const matchName = (l.user_name || '').toLowerCase().includes(query);
    const matchDoc = (l.doc_title || '').toLowerCase().includes(query);
    return matchEmail || matchName || matchDoc;
  });

  renderDownloadLogsTable(filtered);
}

// ==========================================================================
// 7. DIRECT ADMIN MATERIAL UPLOAD
// ==========================================================================
async function handleAdminUpload(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing Material...';
  }

  try {
    const title = document.getElementById('uploadTitle').value.trim();
    const type = document.getElementById('uploadType').value;
    const subject_code = document.getElementById('uploadSubjectCode').value.trim().toUpperCase();
    const semester = document.getElementById('uploadSemester').value;
    const branch = document.getElementById('uploadBranch').value;
    const unit = document.getElementById('uploadUnit').value;
    const fileInput = document.getElementById('uploadFileInput');

    if (!title) {
      FTechApp.showToast('Please enter document title.', 'error');
      return;
    }
    if (!subject_code) {
      FTechApp.showToast('Please enter relevant Subject Code (e.g. KCS-301).', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('type', type);
    formData.append('subject_code', subject_code);
    formData.append('semester', semester);
    formData.append('branch', branch);
    formData.append('unit', unit);
    formData.append('author_name', 'Aditya Kumar Sharma (F-TECH)');

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      formData.append('file', fileInput.files[0]);
    } else if (type === 'syllabus') {
      FTechApp.showToast('Official syllabus requires an attached file (.docx/.pdf).', 'error');
      return;
    }

    const token = localStorage.getItem('ftech_admin_token') || localStorage.getItem('ftech_token');
    const uploadUrl = `${FTechApp.API_BASE}/api/documents/upload`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': FTechApp.API_KEY
      },
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      FTechApp.showToast('Material published successfully to F-TECH Student-Hub!', 'success');
      document.getElementById('adminUploadForm').reset();
      const fileNameEl = document.getElementById('selectedFileName');
      if (fileNameEl) fileNameEl.textContent = '';
      document.getElementById('uploadModal')?.classList.remove('active');
      loadAdminDashboard();
      loadAdminDocumentsTable();
    } else {
      FTechApp.showToast(data.message || data.error || 'Upload failed', 'error');
    }
  } catch (err) {
    FTechApp.showToast('Upload error: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish to F-TECH Hub';
    }
  }
}

// ==========================================================================
// 8. ADMIN OFFICIAL SYLLABUS (DOCX / PDF) UPLOAD MODAL
// ==========================================================================
function openAdminSyllabusModal(code, semester, title) {
  const modal = document.getElementById('adminSyllabusModal');
  const codeInput = document.getElementById('adminSylSubCode');
  const semInput = document.getElementById('adminSylSemester');
  const titleInput = document.getElementById('adminSylTitle');

  if (codeInput) codeInput.value = code;
  if (semInput) semInput.value = `Semester ${semester}`;
  if (titleInput) titleInput.value = `${code} Official AKTU Syllabus & Course Curriculum`;

  const fileInput = document.getElementById('adminSylFileInput');
  const fileNameEl = document.getElementById('adminSylFileName');
  if (fileInput) fileInput.value = '';
  if (fileNameEl) fileNameEl.textContent = '';

  if (modal) modal.classList.add('active');
}

function closeAdminSyllabusModal() {
  const modal = document.getElementById('adminSyllabusModal');
  if (modal) modal.classList.remove('active');
}

async function handleAdminSyllabusSubmit(e) {
  e.preventDefault();
  const fileInput = document.getElementById('adminSylFileInput');
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    FTechApp.showToast('Please select a valid DOCX or PDF syllabus file.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx', 'doc'].includes(ext)) {
    FTechApp.showToast('Official syllabus must be in DOCX or PDF format only.', 'error');
    return;
  }

  const submitBtn = document.getElementById('adminSylSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading Official Syllabus...';
  }

  const code = document.getElementById('adminSylSubCode').value.trim().toUpperCase();
  const sub = (cachedSubjects || []).find(s => s.code.toUpperCase() === code);

  const rawSem = document.getElementById('adminSylSemester')?.value || '';
  const parsedSem = sub ? sub.semester : (parseInt(rawSem.replace(/[^0-9]/g, ''), 10) || 1);

  const formData = new FormData();
  formData.append('title', document.getElementById('adminSylTitle').value.trim());
  formData.append('type', 'syllabus');
  formData.append('subject_code', code);
  formData.append('semester', parsedSem);
  formData.append('branch', sub ? sub.branch : 'CSE');
  formData.append('author_name', 'F-TECH Academic Administration');
  formData.append('file', file);

  const token = localStorage.getItem('ftech_admin_token') || localStorage.getItem('ftech_token');
  const uploadUrl = `${FTechApp.API_BASE}/api/documents/upload`;

  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': FTechApp.API_KEY
      },
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      FTechApp.showToast('Official syllabus uploaded and linked successfully!', 'success');
      closeAdminSyllabusModal();
      document.getElementById('adminSyllabusForm').reset();
      const fileNameEl = document.getElementById('adminSylFileName');
      if (fileNameEl) fileNameEl.textContent = '';
      loadAdminSubjectsTable();
      loadAdminDashboard();
    } else {
      FTechApp.showToast(data.message || data.error || 'Upload failed', 'error');
    }
  } catch (err) {
    FTechApp.showToast('Upload error: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Official Syllabus';
    }
  }
}

// ==========================================================================
// 9. LIVE USER TRACKING & REAL-TIME AUDIT STREAM
// ==========================================================================
async function loadLiveTrackingData() {
  const usersBody = document.getElementById('liveUsersTableBody');
  const feedStream = document.getElementById('liveActivityStream');

  if (usersBody) {
    usersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">Fetching live sessions...</td></tr>`;
  }

  const res = await FTechApp.apiCall('/api/admin/users/live-tracking');
  if (res && res.success && res.data) {
    const d = res.data;

    // Metrics cards
    if (document.getElementById('liveStatTotal')) document.getElementById('liveStatTotal').textContent = d.stats?.totalUsers || d.userCounts?.total || 0;
    if (document.getElementById('liveStatActive')) document.getElementById('liveStatActive').textContent = d.stats?.activeToday || d.userCounts?.online || 0;
    if (document.getElementById('liveStatBlocked')) document.getElementById('liveStatBlocked').textContent = d.stats?.blockedUsers || d.userCounts?.blocked || 0;
    if (document.getElementById('liveStatDb')) document.getElementById('liveStatDb').textContent = d.database ? d.database.split(' ')[0] : 'PostgreSQL';

    // Live Users Table
    const users = d.liveUsers || d.onlineUsers || [];
    if (usersBody) {
      if (users.length === 0) {
        usersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color:var(--text-muted);">No tracked users recorded yet.</td></tr>`;
      } else {
        usersBody.innerHTML = users.map(u => {
          const isSuspended = u.is_blocked === 1;
          const statusBadge = isSuspended 
            ? `<span class="badge-tag" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.4);">Suspended</span>`
            : `<span class="badge-tag" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.4);">● Active</span>`;

          return `
            <tr>
              <td>
                <strong>${FTechApp.escapeHtml(u.full_name)}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${FTechApp.escapeHtml(u.email)}</div>
              </td>
              <td>${FTechApp.escapeHtml(u.branch || 'CSE')} / Sem ${u.semester || 1}</td>
              <td><span style="font-family: var(--font-mono); font-size:0.75rem;">${FTechApp.escapeHtml(u.last_ip || '127.0.0.1')}</span></td>
              <td>${statusBadge}</td>
              <td>
                <button onclick="toggleUserBlockInLive(${u.id}, ${isSuspended ? 1 : 0})" 
                        class="${isSuspended ? 'btn-icon-success' : 'btn-icon-danger'}" 
                        title="${isSuspended ? 'Unblock User' : 'Suspend Account'}">
                  ${isSuspended ? '🔓 Unblock' : '🚫 Block'}
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Live Activity Stream
    const logs = d.activityLogs || d.recentLogs || [];
    if (feedStream) {
      if (logs.length === 0) {
        feedStream.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-muted);">No recent activity recorded.</div>`;
      } else {
        feedStream.innerHTML = logs.map(l => {
          let actionColor = '#3b82f6';
          let actionIcon = '⚡';
          if (l.action === 'REGISTER') { actionColor = '#10b981'; actionIcon = '🎉'; }
          if (l.action === 'DOWNLOAD') { actionColor = '#f59e0b'; actionIcon = '📥'; }
          if (l.action === 'BLOCKED') { actionColor = '#ef4444'; actionIcon = '🚫'; }
          if (l.action === 'UNBLOCKED') { actionColor = '#10b981'; actionIcon = '🔓'; }

          const timeStr = l.created_at ? new Date(l.created_at).toLocaleTimeString() : 'Just now';

          return `
            <div style="padding: 0.65rem 0.85rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-glass); display: flex; gap: 0.75rem; align-items: center; font-size: 0.82rem;">
              <span style="font-size: 1.1rem;">${actionIcon}</span>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                  <strong style="color: ${actionColor}; font-size: 0.78rem;">${FTechApp.escapeHtml(l.action)}</strong>
                  <span style="font-size: 0.7rem; color: var(--text-dim);">${timeStr}</span>
                </div>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.78rem; color: var(--text-main);">
                  <strong>${FTechApp.escapeHtml(l.user_name || l.user_email || 'User')}:</strong> ${FTechApp.escapeHtml(l.details || '')}
                </div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">IP: ${FTechApp.escapeHtml(l.ip_address || '127.0.0.1')}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }
}

async function toggleUserBlockInLive(id, currentBlocked) {
  const res = await FTechApp.apiCall(`/api/admin/users/${id}/block`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });

  if (res && res.success) {
    FTechApp.showToast(res.message, 'success');
    loadLiveTrackingData();
    loadAdminUsersTable();
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res?.message || 'Failed to update user status', 'error');
  }
}

// ==========================================================================
// 10. SUBSUBJECTS / COURSE UNITS GOVERNANCE
// ==========================================================================
let cachedSubsubjects = [];

async function loadAdminSubsubjectsTable() {
  const tableBody = document.getElementById('adminSubsubjectTableBody') || document.getElementById('adminSubsubjectsTableBody');
  if (!tableBody) return;

  const subjectCodeFilter = document.getElementById('subsubFilterSubject')?.value || '';
  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Loading course units...</td></tr>`;

  let url = '/api/admin/subsubjects';
  if (subjectCodeFilter) url += `?subject_code=${encodeURIComponent(subjectCodeFilter)}`;

  const res = await FTechApp.apiCall(url);
  if (res && res.success && res.data) {
    cachedSubsubjects = res.data;
    const badge = document.getElementById('badgeSubsubCount');
    if (badge) badge.textContent = cachedSubsubjects.length;

    // Populate filter dropdown if empty
    const filterSelect = document.getElementById('subsubFilterSubject');
    if (filterSelect && filterSelect.options.length <= 1 && cachedSubjects.length > 0) {
      cachedSubjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.code;
        opt.textContent = `${s.code} - ${s.title.substring(0, 25)}...`;
        filterSelect.appendChild(opt);
      });
      if (subjectCodeFilter) filterSelect.value = subjectCodeFilter;
    }

    renderAdminSubsubjectsTable(cachedSubsubjects);
  } else {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color:var(--accent-rose);">Failed to load units.</td></tr>`;
  }
}

function renderAdminSubsubjectsTable(units) {
  const tableBody = document.getElementById('adminSubsubjectTableBody') || document.getElementById('adminSubsubjectsTableBody');
  if (!tableBody) return;

  if (units.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No course units found. Click "+ Add Course Unit" to create one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = units.map(u => `
    <tr>
      <td><span class="card-code">${FTechApp.escapeHtml(u.subject_code)}</span></td>
      <td><strong>Unit ${u.unit_number || u.unit_no || 1}</strong></td>
      <td>
        <strong>${FTechApp.escapeHtml(u.title)}</strong>
        ${u.description ? `<div style="font-size:0.75rem; color:var(--text-muted); max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${FTechApp.escapeHtml(u.description)}</div>` : ''}
      </td>
      <td>
        <div style="font-size:0.78rem; color:var(--text-muted); max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${FTechApp.escapeHtml(u.topics || '')}">
          ${FTechApp.escapeHtml(u.topics || 'Standard AKTU curriculum topics')}
        </div>
      </td>
      <td><span style="font-size:0.78rem; color:var(--text-dim);">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}</span></td>
      <td>
        <div style="display:flex; gap:0.35rem; align-items:center;">
          <button onclick="openEditSubsubjectModal(${u.id})" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.5rem;" title="Edit Unit">
            ✏️ Edit
          </button>
          <button onclick="deleteSubsubjectAdmin(${u.id}, '${FTechApp.escapeHtml(u.title).replace(/'/g, "\\'")}')" class="btn-icon-danger" title="Delete Unit">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterSubsubjectsByCode(code) {
  switchAdminTab('subsubjects');
  const filterSelect = document.getElementById('subsubFilterSubject');
  if (filterSelect) {
    let exists = Array.from(filterSelect.options).some(o => o.value === code);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${code}`;
      filterSelect.appendChild(opt);
    }
    filterSelect.value = code;
  }
  loadAdminSubsubjectsTable();
}

function openCreateSubsubjectModal(defaultCode = '') {
  document.getElementById('subsubjectForm')?.reset();
  const idEl = document.getElementById('subsubEditId');
  if (idEl) idEl.value = '';
  const titleEl = document.getElementById('subsubjectModalTitle');
  if (titleEl) titleEl.textContent = 'Add Course Unit / Module';
  const saveBtn = document.getElementById('subsubSaveBtn');
  if (saveBtn) saveBtn.textContent = 'Save Course Unit';
  if (defaultCode) {
    const codeEl = document.getElementById('subsubCodeInput');
    if (codeEl) codeEl.value = defaultCode;
  }
  document.getElementById('subsubjectModal')?.classList.add('active');
}

function openEditSubsubjectModal(id) {
  const unit = cachedSubsubjects.find(u => u.id === id);
  if (!unit) return;

  const idEl = document.getElementById('subsubEditId');
  if (idEl) idEl.value = unit.id;
  document.getElementById('subsubCodeInput').value = unit.subject_code || '';
  document.getElementById('subsubUnitNumInput').value = unit.unit_number || unit.unit_no || 1;
  document.getElementById('subsubTitleInput').value = unit.title || '';
  document.getElementById('subsubDescInput').value = unit.description || '';
  document.getElementById('subsubTopicsInput').value = unit.topics || '';

  const titleEl = document.getElementById('subsubjectModalTitle');
  if (titleEl) titleEl.textContent = `Edit Unit ${unit.unit_number || 1} (${unit.subject_code})`;
  const saveBtn = document.getElementById('subsubSaveBtn');
  if (saveBtn) saveBtn.textContent = 'Update Course Unit';
  document.getElementById('subsubjectModal')?.classList.add('active');
}

function closeSubsubjectModal() {
  document.getElementById('subsubjectModal')?.classList.remove('active');
}

async function handleSaveSubsubject(e) {
  e.preventDefault();
  const id = document.getElementById('subsubEditId')?.value;
  const subject_code = document.getElementById('subsubCodeInput').value.trim().toUpperCase();
  const unit_number = parseInt(document.getElementById('subsubUnitNumInput').value, 10) || 1;
  const title = document.getElementById('subsubTitleInput').value.trim();
  const description = document.getElementById('subsubDescInput').value.trim();
  const topics = document.getElementById('subsubTopicsInput').value.trim();

  const payload = { subject_code, unit_number, title, description, topics };

  let res;
  if (id) {
    res = await FTechApp.apiCall(`/api/admin/subsubjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } else {
    res = await FTechApp.apiCall('/api/admin/subsubjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  if (res && res.success) {
    FTechApp.showToast(res.message || 'Course unit saved successfully!', 'success');
    closeSubsubjectModal();
    loadAdminSubsubjectsTable();
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res?.message || 'Failed to save course unit', 'error');
  }
}

async function deleteSubsubjectAdmin(id, title) {
  if (!confirm(`Are you sure you want to delete unit "${title}"?`)) return;

  const res = await FTechApp.apiCall(`/api/admin/subsubjects/${id}`, { method: 'DELETE' });
  if (res && res.success) {
    FTechApp.showToast(res.message, 'success');
    loadAdminSubsubjectsTable();
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res?.message || 'Failed to delete subsubject', 'error');
  }
}

// ==========================================================================
// 11. EDIT SUBJECT MODAL LOGIC
// ==========================================================================
function openEditSubjectModal(id) {
  const sub = cachedSubjects.find(s => s.id === id);
  if (!sub) return;

  const setVal = (id1, id2, val) => {
    const el = document.getElementById(id1) || document.getElementById(id2);
    if (el) el.value = val;
  };

  setVal('editSubId', 'editSubId', sub.id);
  setVal('editSubCodeInput', 'editSubCode', sub.code);
  setVal('editSubCreditsInput', 'editSubCredits', sub.credits || 4);
  setVal('editSubTitleInput', 'editSubTitle', sub.title);
  setVal('editSubSemInput', 'editSubSem', sub.semester);
  setVal('editSubBranchInput', 'editSubBranch', sub.branch || 'CSE');
  setVal('editSubDescInput', 'editSubDesc', sub.description || '');

  document.getElementById('editSubjectModal')?.classList.add('active');
}

function closeEditSubjectModal() {
  document.getElementById('editSubjectModal')?.classList.remove('active');
}

async function handleUpdateSubject(e) {
  e.preventDefault();
  const getVal = (id1, id2) => {
    const el = document.getElementById(id1) || document.getElementById(id2);
    return el ? el.value : '';
  };

  const id = getVal('editSubId', 'editSubId');
  const code = getVal('editSubCodeInput', 'editSubCode').trim().toUpperCase();
  const credits = getVal('editSubCreditsInput', 'editSubCredits');
  const title = getVal('editSubTitleInput', 'editSubTitle').trim();
  const semester = getVal('editSubSemInput', 'editSubSem');
  const branch = getVal('editSubBranchInput', 'editSubBranch');
  const description = getVal('editSubDescInput', 'editSubDesc').trim();

  const res = await FTechApp.apiCall(`/api/admin/subjects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, credits, title, semester, branch, description })
  });

  if (res && res.success) {
    FTechApp.showToast(res.message, 'success');
    closeEditSubjectModal();
    loadAdminSubjectsTable();
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res?.message || 'Failed to update subject', 'error');
  }
}

// ==========================================================================
// 12. EDIT DOCUMENT MODAL LOGIC
// ==========================================================================
function openEditDocModal(id) {
  const doc = cachedDocs.find(d => d.id === id);
  if (!doc) return;

  document.getElementById('editDocId').value = doc.id;
  document.getElementById('editDocTitle').value = doc.title;
  document.getElementById('editDocType').value = doc.type;
  document.getElementById('editDocSubjectCode').value = doc.subject_code || '';
  document.getElementById('editDocSemester').value = doc.semester || 1;
  document.getElementById('editDocUnit').value = doc.unit || 1;
  document.getElementById('editDocStatus').value = doc.is_approved !== undefined ? String(doc.is_approved) : '1';
  document.getElementById('editDocAuthor').value = doc.author_name || '';

  document.getElementById('editDocModal')?.classList.add('active');
}

function closeEditDocModal() {
  document.getElementById('editDocModal')?.classList.remove('active');
}

async function handleUpdateDoc(e) {
  e.preventDefault();
  const id = document.getElementById('editDocId').value;
  const title = document.getElementById('editDocTitle').value.trim();
  const type = document.getElementById('editDocType').value;
  const subject_code = document.getElementById('editDocSubjectCode').value.trim().toUpperCase();
  const semester = document.getElementById('editDocSemester').value;
  const unit = document.getElementById('editDocUnit').value;
  const is_approved = parseInt(document.getElementById('editDocStatus').value, 10);
  const author_name = document.getElementById('editDocAuthor').value.trim();

  const res = await FTechApp.apiCall(`/api/admin/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, type, subject_code, semester, unit, is_approved, author_name })
  });

  if (res && res.success) {
    FTechApp.showToast(res.message, 'success');
    closeEditDocModal();
    loadAdminDocumentsTable();
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res?.message || 'Failed to update document', 'error');
  }
}

// ==========================================================================
// 13. EDIT LAB EXPERIMENT MODAL LOGIC
// ==========================================================================
function openEditLabModal(id) {
  const lab = cachedLabs.find(l => l.id === id);
  if (!lab) return;

  document.getElementById('editLabId').value = lab.id;
  document.getElementById('editLabSubCode').value = lab.subject_code;
  document.getElementById('editLabExpNo').value = lab.exp_no;
  document.getElementById('editLabTitle').value = lab.title;
  document.getElementById('editLabLang').value = lab.language || 'C/C++';
  document.getElementById('editLabObjective').value = lab.objective || '';
  document.getElementById('editLabCode').value = lab.code || '';
  document.getElementById('editLabOutput').value = lab.output_sample || '';
  document.getElementById('editLabViva').value = lab.viva_questions || '';

  document.getElementById('editLabModal')?.classList.add('active');
}

function closeEditLabModal() {
  document.getElementById('editLabModal')?.classList.remove('active');
}

async function handleUpdateLab(e) {
  e.preventDefault();
  const id = document.getElementById('editLabId').value;
  const subject_code = document.getElementById('editLabSubCode').value.trim().toUpperCase();
  const exp_no = document.getElementById('editLabExpNo').value;
  const title = document.getElementById('editLabTitle').value.trim();
  const language = document.getElementById('editLabLang').value.trim();
  const objective = document.getElementById('editLabObjective').value.trim();
  const code = document.getElementById('editLabCode').value;
  const output_sample = document.getElementById('editLabOutput').value.trim();
  const viva_questions = document.getElementById('editLabViva').value.trim();

  const res = await FTechApp.apiCall(`/api/admin/labs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject_code, exp_no, title, language, objective, code, output_sample, viva_questions })
  });

  if (res && res.success) {
    FTechApp.showToast(res.message, 'success');
    closeEditLabModal();
    loadAdminLabsTable();
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res?.message || 'Failed to update lab experiment', 'error');
  }
}


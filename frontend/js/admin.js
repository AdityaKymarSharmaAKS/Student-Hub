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
let cachedLabs = [];
let cachedCommunity = [];
let cachedUsers = [];
let cachedDownloadLogs = [];

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
    }, 600);
  } else {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In to F-TECH Admin';
    FTechApp.showToast(res.message || 'Invalid admin credentials', 'error');
  }
}

// Check admin auth state
function checkAdminAuth() {
  const adminToken = localStorage.getItem('ftech_admin_token') || localStorage.getItem('ftech_token');
  const user = JSON.parse(localStorage.getItem('ftech_user') || '{}');
  const adminUser = JSON.parse(localStorage.getItem('ftech_admin_user') || '{}');

  const role = ((user.role || '') + ' ' + (adminUser.role || '')).toLowerCase();
  const isAdmin = role.includes('admin') || user.isAdmin === true || adminUser.isAdmin === true;

  if (!adminToken || !isAdmin) {
    FTechApp.showToast('Administrator privileges required. Please sign in with your Admin ID.', 'error');
    setTimeout(() => {
      window.location.href = '../pages/login.html';
    }, 400);
    return false;
  }
  return true;
}

// Logout
function adminLogout() {
  localStorage.removeItem('ftech_admin_token');
  localStorage.removeItem('ftech_admin_user');
  localStorage.removeItem('ftech_token');
  localStorage.removeItem('ftech_user');
  FTechApp.showToast('Logged out from F-TECH Admin', 'info');
  setTimeout(() => {
    window.location.href = '../pages/login.html';
  }, 400);
}

// Tab Switching
function switchAdminTab(tabKey) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.remove('active'));

  const targetPane = document.getElementById(`tab-${tabKey}`);
  if (targetPane) targetPane.classList.add('active');

  const activeBtn = Array.from(document.querySelectorAll('.admin-tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabKey));
  if (activeBtn) activeBtn.classList.add('active');

  if (tabKey === 'documents') loadAdminDocumentsTable();
  if (tabKey === 'subjects') loadAdminSubjectsTable();
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
// 2. SUBJECTS TABLE & DELETE SUBJECT
// --------------------------------------------------------------------------
async function loadAdminSubjectsTable() {
  const tableBody = document.getElementById('adminSubjectTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading subjects...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/subjects');
  if (res.success && res.data) {
    cachedSubjects = res.data;
    if (document.getElementById('badgeSubsCount')) document.getElementById('badgeSubsCount').textContent = cachedSubjects.length;
    renderAdminSubjectsTable(cachedSubjects);
  } else {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color:var(--accent-rose);">${res.message || 'Failed to load subjects'}</td></tr>`;
  }
}

function renderAdminSubjectsTable(subjects) {
  const tableBody = document.getElementById('adminSubjectTableBody');
  if (!tableBody) return;

  if (subjects.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No subjects found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = subjects.map(s => `
    <tr>
      <td><span class="card-code">${FTechApp.escapeHtml(s.code)}</span></td>
      <td>
        <strong>${FTechApp.escapeHtml(s.title)}</strong>
        ${s.description ? `<div style="font-size:0.75rem; color:var(--text-muted); max-width:350px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${FTechApp.escapeHtml(s.description)}</div>` : ''}
      </td>
      <td>${FTechApp.escapeHtml(s.branch)}</td>
      <td>Semester ${s.semester}</td>
      <td>${s.credits} Credits</td>
      <td><span class="badge-tag badge-aktu">${s.doc_count || 0} Docs</span></td>
      <td>
        <button onclick="deleteSubjectAdmin(${s.id}, '${FTechApp.escapeHtml(s.code)}', '${FTechApp.escapeHtml(s.title)}')" class="btn-icon-danger" title="Delete Subject">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
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
          <button onclick="deleteLabAdmin(${lab.id}, '${FTechApp.escapeHtml(lab.title)}')" class="btn-icon-danger" title="Delete Lab Experiment">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
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

// Direct Admin Material Upload
async function handleAdminUpload(e) {
  e.preventDefault();
  const title = document.getElementById('uploadTitle').value.trim();
  const type = document.getElementById('uploadType').value;
  const subject_code = document.getElementById('uploadSubjectCode').value.trim();
  const semester = document.getElementById('uploadSemester').value;
  const branch = document.getElementById('uploadBranch').value;
  const unit = document.getElementById('uploadUnit').value;
  const fileInput = document.getElementById('uploadFileInput');

  const formData = new FormData();
  formData.append('title', title);
  formData.append('type', type);
  formData.append('subject_code', subject_code);
  formData.append('semester', semester);
  formData.append('branch', branch);
  formData.append('unit', unit);
  formData.append('author_name', 'Aditya Kumar Sharma (F-TECH)');

  if (fileInput.files.length > 0) {
    formData.append('file', fileInput.files[0]);
  }

  const token = localStorage.getItem('ftech_admin_token') || localStorage.getItem('ftech_token');

  try {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      FTechApp.showToast('Material published directly to F-TECH Hub!', 'success');
      document.getElementById('adminUploadForm').reset();
      document.getElementById('selectedFileName').textContent = '';
      document.getElementById('uploadModal')?.classList.remove('active');
      loadAdminDashboard();
      loadAdminDocumentsTable();
    } else {
      FTechApp.showToast(data.message || 'Upload failed', 'error');
    }
  } catch (err) {
    FTechApp.showToast('Upload failed: ' + err.message, 'error');
  }
}

/**
 * ==========================================================================
 * F-TECH-Student-Hub Admin Logic & Governance
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

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
    localStorage.setItem('ftech_user', JSON.stringify({ fullName: res.admin.fullName, role: 'SuperAdmin' }));
    localStorage.setItem('ftech_token', res.token);
    FTechApp.showToast(`Welcome back, ${res.admin.fullName}!`, 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  } else {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In to F-TECH Admin';
    FTechApp.showToast(res.message || 'Invalid admin credentials', 'error');
  }
}

// Check admin auth state
function checkAdminAuth() {
  const token = localStorage.getItem('ftech_admin_token');
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Logout
function adminLogout() {
  localStorage.removeItem('ftech_admin_token');
  localStorage.removeItem('ftech_admin_user');
  FTechApp.showToast('Logged out from F-TECH Admin', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 600);
}

// Load Admin Dashboard Data
async function loadAdminDashboard() {
  if (!checkAdminAuth()) return;

  const user = JSON.parse(localStorage.getItem('ftech_admin_user') || '{}');
  const adminNameEl = document.getElementById('adminDisplayName');
  if (adminNameEl) {
    adminNameEl.textContent = user.fullName || 'Aditya Kumar Sharma';
  }

  // 1. Fetch Stats
  const statsRes = await FTechApp.apiCall('/api/admin/stats');
  if (statsRes.success && statsRes.stats) {
    const s = statsRes.stats;
    if (document.getElementById('statTotalDocs')) document.getElementById('statTotalDocs').textContent = s.documentsCount;
    if (statsRes.stats.papersCount && document.getElementById('statTotalPapers')) document.getElementById('statTotalPapers').textContent = s.papersCount;
    if (document.getElementById('statTotalDownloads')) document.getElementById('statTotalDownloads').textContent = s.totalDownloads.toLocaleString();
    if (document.getElementById('statTotalSubjects')) document.getElementById('statTotalSubjects').textContent = s.subjectsCount;
  }

  // 2. Fetch Document Table
  loadAdminDocumentsTable();
}

async function loadAdminDocumentsTable() {
  const tableBody = document.getElementById('adminDocTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Loading files...</td></tr>`;

  const res = await FTechApp.apiCall('/api/admin/documents');
  if (res.success && res.data) {
    if (res.data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">No documents uploaded.</td></tr>`;
      return;
    }

    tableBody.innerHTML = res.data.map(doc => `
      <tr>
        <td>
          <strong>${doc.title}</strong>
          <div style="font-size:0.75rem; color:var(--text-dim);">${doc.file_name}</div>
        </td>
        <td><span class="card-code">${doc.subject_code}</span></td>
        <td>Sem ${doc.semester}</td>
        <td>
          <span class="badge-tag ${doc.type === 'aktu-paper' ? 'badge-aktu' : 'badge-notes'}">
            ${doc.type}
          </span>
        </td>
        <td>${doc.downloads_count}</td>
        <td>
          <div class="action-buttons">
            <button onclick="deleteDocAdmin(${doc.id})" class="btn-icon-danger" title="Delete">
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

async function deleteDocAdmin(id) {
  if (!confirm('Are you sure you want to permanently delete this document from F-TECH servers?')) {
    return;
  }

  const res = await FTechApp.apiCall(`/api/admin/documents/${id}`, {
    method: 'DELETE'
  });

  if (res.success) {
    FTechApp.showToast('Document deleted successfully', 'success');
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res.message || 'Failed to delete', 'error');
  }
}

// Add Subject Form
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
    FTechApp.showToast('Subject created successfully in F-TECH!', 'success');
    document.getElementById('createSubjectForm').reset();
    const modal = document.getElementById('subjectModal');
    if (modal) modal.classList.remove('active');
    loadAdminDashboard();
  } else {
    FTechApp.showToast(res.message || 'Creation failed', 'error');
  }
}

/**
 * ==========================================================================
 * F-TECH-Student-Hub Core Application JS
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

const FTechApp = (() => {
  // Determine API base url
  const API_BASE = window.location.origin.includes('5000') || window.location.protocol.startsWith('http')
    ? window.location.origin
    : 'http://localhost:5000';

  // Toast Notification System
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Generic API caller with token header injection
  async function apiCall(endpoint, options = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      const headers = options.headers || {};
      
      const token = localStorage.getItem('ftech_token') || localStorage.getItem('ftech_admin_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      return { success: false, message: error.message };
    }
  }

  // Theme management (Dark / Light)
  function initTheme() {
    const savedTheme = localStorage.getItem('ftech_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('ftech_theme', nextTheme);
        showToast(`Switched to ${nextTheme} mode`, 'info');
      });
    }
  }

  // User State Management
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem('ftech_user');
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  }

  function setCurrentUser(user, token) {
    if (user) {
      localStorage.setItem('ftech_user', JSON.stringify(user));
    }
    if (token) {
      localStorage.setItem('ftech_token', token);
      if (user && (user.role === 'SuperAdmin' || user.role === 'Admin')) {
        localStorage.setItem('ftech_admin_token', token);
        localStorage.setItem('ftech_admin_user', JSON.stringify(user));
      }
    }
    updateUserUI();
  }

  function logout() {
    localStorage.removeItem('ftech_user');
    localStorage.removeItem('ftech_token');
    localStorage.removeItem('ftech_admin_token');
    localStorage.removeItem('ftech_admin_user');
    showToast('You have signed out. Redirecting to login...', 'info');
    setTimeout(() => {
      const rawPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
      if (rawPath.includes('/admin/')) {
        window.location.href = '../pages/login.html';
      } else if (rawPath.includes('/pages/')) {
        window.location.href = 'login.html';
      } else {
        window.location.href = 'pages/login.html';
      }
    }, 400);
  }

  function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Update navbar and sidebar with the current user's actual name
  function updateUserUI() {
    const user = getCurrentUser();
    const navRight = document.querySelector('.nav-right');

    // 1. Navbar user slot
    let userSlot = document.getElementById('navbarUserSlot');
    if (!userSlot && navRight) {
      userSlot = document.createElement('div');
      userSlot.id = 'navbarUserSlot';
      userSlot.style.display = 'inline-flex';
      userSlot.style.alignItems = 'center';
      userSlot.style.gap = '0.5rem';
      navRight.insertBefore(userSlot, navRight.firstChild);
    }

    if (userSlot) {
      if (user) {
        userSlot.innerHTML = `
          <div class="user-profile-badge" style="display:inline-flex; align-items:center; gap:0.5rem; background:rgba(99,102,241,0.12); padding:0.35rem 0.75rem; border-radius:var(--radius-full); border:1px solid rgba(99,102,241,0.25);">
            <div style="width:28px; height:28px; border-radius:50%; background:var(--grad-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800;">
              ${getInitials(user.fullName)}
            </div>
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-main);">${user.fullName}</span>
            <button onclick="FTechApp.logout()" class="btn-sm" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:var(--accent-rose); padding:0 0.2rem;" title="Sign Out">
              ✕
            </button>
          </div>
        `;
      } else {
        userSlot.innerHTML = `
          <button onclick="FTechApp.openAuthModal()" class="btn btn-primary btn-sm">
            Sign In / Register
          </button>
        `;
      }
    }

    // 2. Sidebar profile card
    const sidebarFounderCard = document.querySelector('.sidebar-founder-card');
    if (sidebarFounderCard) {
      if (user) {
        sidebarFounderCard.innerHTML = `
          <div class="founder-header" style="margin-bottom:0.5rem;">
            <div class="founder-avatar" style="background:var(--grad-brand);">
              ${getInitials(user.fullName)}
            </div>
            <div class="founder-details">
              <h6>${user.fullName}</h6>
              <p>${user.branch ? `${user.branch} • Sem ${user.semester}` : (user.role || 'Member')}</p>
            </div>
          </div>
          <div class="company-tag" style="justify-content:space-between; margin-bottom:0.5rem; padding-bottom:0.5rem;">
            <span class="status-online"><span class="status-dot"></span> Logged In</span>
            <a href="javascript:void(0)" onclick="FTechApp.logout()" style="color:var(--accent-rose); font-size:0.75rem; font-weight:600;">Log Out</a>
          </div>
          <div style="font-size:0.68rem; color:var(--text-dim); border-top:1px dashed var(--border-glass); padding-top:0.4rem;">
            🏢 <strong>F-TECH</strong> • Platform by Aditya Kumar Sharma
          </div>
        `;
      } else {
        sidebarFounderCard.innerHTML = `
          <div class="founder-header">
            <div class="founder-avatar">AS</div>
            <div class="founder-details">
              <h6>Aditya Kumar Sharma</h6>
              <p>Founder & Owner (F-TECH)</p>
            </div>
          </div>
          <div class="company-tag" style="margin-bottom:0.5rem;">
            <span>Company: <strong>F-TECH</strong></span>
            <span class="status-online"><span class="status-dot"></span> Live</span>
          </div>
          <button onclick="FTechApp.openAuthModal()" class="btn btn-secondary btn-sm" style="width:100%; font-size:0.75rem; padding:0.35rem 0.5rem;">
            Sign In with Your Name
          </button>
        `;
      }
    }

    // 3. Auto-populate upload author if form exists
    const authorInput = document.getElementById('uploadAuthor');
    if (authorInput && user && !authorInput.value) {
      authorInput.value = user.fullName;
    }

    // 4. Auto-populate community author
    const postAuthorInput = document.getElementById('postAuthor');
    if (postAuthorInput && user && !postAuthorInput.value) {
      postAuthorInput.value = `${user.fullName} (${user.branch || 'Student'})`;
    }
  }

  // Auth Modal (Sign In / Register)
  function createAuthModal() {
    let modal = document.getElementById('globalAuthModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'globalAuthModal';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <div style="display:flex; gap:1rem;">
            <button id="authTabLogin" class="filter-chip active" style="border-radius:var(--radius-sm); font-size:0.9rem;" onclick="FTechApp.switchAuthTab('login')">Sign In</button>
            <button id="authTabRegister" class="filter-chip" style="border-radius:var(--radius-sm); font-size:0.9rem;" onclick="FTechApp.switchAuthTab('register')">Create Account</button>
          </div>
          <span class="modal-close" onclick="FTechApp.closeAuthModal()">&times;</span>
        </div>

        <!-- Login Form -->
        <form id="ftechLoginForm" class="modal-body" onsubmit="FTechApp.handleLogin(event)">
          <div class="form-group">
            <label>Email or Username *</label>
            <input type="text" id="loginEmail" class="form-control" placeholder="alok.vishwakarma@college.edu or admin" required>
          </div>
          <div class="form-group">
            <label>Password *</label>
            <input type="password" id="loginPassword" class="form-control" placeholder="••••••••••••" required>
          </div>
          <button type="submit" id="loginSubmitBtn" class="btn btn-primary" style="margin-top:0.5rem;">
            Sign In to My Account
          </button>
          <div style="text-align:center; font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
            Don't have an account yet? <a href="javascript:void(0)" onclick="FTechApp.switchAuthTab('register')" style="color:var(--primary); font-weight:700;">Create one here</a>
          </div>
        </form>

        <!-- Register Form -->
        <form id="ftechRegisterForm" class="modal-body" style="display:none;" onsubmit="FTechApp.handleRegister(event)">
          <div class="form-group">
            <label>Your Full Name *</label>
            <input type="text" id="regFullName" class="form-control" placeholder="e.g. Alok Vishwakarma" required>
          </div>
          <div class="form-group">
            <label>College / Personal Email *</label>
            <input type="email" id="regEmail" class="form-control" placeholder="alok.vishwakarma@college.edu" required>
          </div>
          <div class="form-group">
            <label>Choose Password *</label>
            <input type="password" id="regPassword" class="form-control" placeholder="Minimum 6 characters" required>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div class="form-group">
              <label>Branch</label>
              <select id="regBranch" class="form-control">
                <option value="CSE">CSE / IT</option>
                <option value="ECE">ECE</option>
                <option value="ME">Mechanical</option>
                <option value="Civil">Civil</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Semester</label>
              <select id="regSemester" class="form-control">
                <option value="1">Sem 1</option>
                <option value="2">Sem 2</option>
                <option value="3" selected>Sem 3</option>
                <option value="4">Sem 4</option>
                <option value="5">Sem 5</option>
                <option value="6">Sem 6</option>
                <option value="7">Sem 7</option>
                <option value="8">Sem 8</option>
              </select>
            </div>
          </div>
          <button type="submit" id="regSubmitBtn" class="btn btn-primary" style="margin-top:0.5rem;">
            Join F-TECH Student-Hub
          </button>
          <div style="text-align:center; font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
            Already have an account? <a href="javascript:void(0)" onclick="FTechApp.switchAuthTab('login')" style="color:var(--primary); font-weight:700;">Sign In</a>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAuthModal();
    });

    return modal;
  }

  function openAuthModal() {
    const modal = createAuthModal();
    modal.classList.add('active');
  }

  function closeAuthModal() {
    const modal = document.getElementById('globalAuthModal');
    if (modal) modal.classList.remove('active');
  }

  function switchAuthTab(tab) {
    const loginTab = document.getElementById('authTabLogin');
    const regTab = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('ftechLoginForm');
    const regForm = document.getElementById('ftechRegisterForm');

    if (tab === 'login') {
      loginTab.classList.add('active');
      regTab.classList.remove('active');
      loginForm.style.display = 'flex';
      regForm.style.display = 'none';
    } else {
      loginTab.classList.remove('active');
      regTab.classList.add('active');
      loginForm.style.display = 'none';
      regForm.style.display = 'flex';
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginSubmitBtn');

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const res = await apiCall('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    btn.disabled = false;
    btn.textContent = 'Sign In to My Account';

    if (res.success && res.user) {
      setCurrentUser(res.user, res.token);
      const isAdmin = res.isAdmin || res.user.role === 'SuperAdmin' || res.user.role === 'Admin';

      if (isAdmin) {
        localStorage.setItem('ftech_admin_token', res.token);
        localStorage.setItem('ftech_admin_user', JSON.stringify(res.user));
        showToast(`Welcome Administrator, ${res.user.fullName}! Opening Governance Panel...`, 'success');
        closeAuthModal();
        setTimeout(() => {
          const rawPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
          const target = rawPath.includes('/pages/') ? '../admin/dashboard.html' : 'admin/dashboard.html';
          window.location.href = target;
        }, 500);
      } else {
        showToast(`Welcome back, ${res.user.fullName}!`, 'success');
        closeAuthModal();
        const rawPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        if (rawPath.includes('login.html') || rawPath.includes('register.html')) {
          setTimeout(() => {
            window.location.href = '../index.html';
          }, 500);
        } else {
          updateUserUI();
        }
      }
    } else {
      showToast(res.message || 'Invalid credentials', 'error');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const branch = document.getElementById('regBranch').value;
    const semester = document.getElementById('regSemester').value;
    const btn = document.getElementById('regSubmitBtn');

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    const res = await apiCall('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, branch, semester })
    });

    btn.disabled = false;
    btn.textContent = 'Join F-TECH Student-Hub';

    if (res.success) {
      showToast(res.message || 'Account created! Please sign in with your credentials.', 'success');
      // If user is on a dedicated register page, redirect to login.html with email query
      if (window.location.pathname.includes('register.html')) {
        setTimeout(() => {
          window.location.href = `login.html?registered=1&email=${encodeURIComponent(email)}`;
        }, 600);
        return;
      }

      // If in modal, switch tab to login, pre-fill email, and prompt user to enter password
      switchAuthTab('login');
      const loginEmailInput = document.getElementById('loginEmail');
      const loginPassInput = document.getElementById('loginPassword');
      if (loginEmailInput) loginEmailInput.value = email;
      if (loginPassInput) {
        loginPassInput.value = '';
        loginPassInput.focus();
      }
      const regForm = document.getElementById('ftechRegisterForm');
      if (regForm) regForm.reset();
    } else {
      showToast(res.message || 'Registration failed', 'error');
    }
  }

  // Enforce authentication on all app pages
  function enforceAuthGuard() {
    const rawPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
    const isLoginOrReg = rawPath.endsWith('/login.html') || rawPath.endsWith('login.html') ||
                         rawPath.endsWith('/register.html') || rawPath.endsWith('register.html');
    const isAdminDashboard = rawPath.includes('/admin/dashboard.html');

    const user = getCurrentUser();
    const token = localStorage.getItem('ftech_token');

    // 1. If NOT logged in, redirect to login page
    if (!user || !token) {
      if (!isLoginOrReg && !isAdminDashboard) {
        const targetLogin = rawPath.includes('/pages/') 
          ? 'login.html' 
          : (rawPath.includes('/admin/') ? '../pages/login.html' : 'pages/login.html');
        window.location.replace(targetLogin);
        return false;
      }
    } else {
      // 2. If logged in and on login/register page, send to appropriate area
      if (isLoginOrReg) {
        if (user.role === 'SuperAdmin' || user.role === 'Admin' || user.isAdmin) {
          window.location.replace('../admin/dashboard.html');
        } else {
          window.location.replace('../index.html');
        }
        return false;
      }
    }
    return true;
  }

  return {
    API_BASE,
    showToast,
    apiCall,
    initTheme,
    getCurrentUser,
    setCurrentUser,
    logout,
    updateUserUI,
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    handleLogin,
    handleRegister,
    enforceAuthGuard
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  FTechApp.initTheme();
  const allowed = FTechApp.enforceAuthGuard();
  if (allowed) {
    FTechApp.updateUserUI();
  }
});

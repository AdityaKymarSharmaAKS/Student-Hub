/**
 * ==========================================================================
 * F-TECH-Student-Hub Subjects & Syllabus Logic
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

let allSubjects = [];
let currentSubjectData = null;
let activeSemesterNumber = 1;
let totalConfiguredSemesters = 8;

// Format file size in KB or MB
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '1.2 MB';
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// --------------------------------------------------------------------------
// 1. ALL SUBJECTS DIRECTORY VIEW
// --------------------------------------------------------------------------
async function loadSubjects(filters = {}) {
  const container = document.getElementById('subjectsGrid');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
      <div class="spinner" style="margin-bottom: 1rem;">⚡</div>
      <p>Loading F-TECH academic curriculum...</p>
    </div>
  `;

  let query = new URLSearchParams(filters).toString();
  const res = await FTechApp.apiCall(`/api/subjects?${query}`);

  if (res.success && res.data) {
    allSubjects = res.data;
    if (res.maxSemesters) {
      totalConfiguredSemesters = res.maxSemesters;
      populateSemesterFilters(res.maxSemesters);
    }
    renderSubjectCards(allSubjects);
  } else {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--accent-rose);">
        <p>Failed to load subjects. Please check server connection.</p>
      </div>
    `;
  }
}

function populateSemesterFilters(maxSem) {
  const semFilter = document.getElementById('subSemFilter');
  if (!semFilter) return;

  const currentVal = semFilter.value;
  let options = '<option value="">All Semesters</option>';
  for (let i = 1; i <= maxSem; i++) {
    options += `<option value="${i}">Semester ${i}</option>`;
  }
  semFilter.innerHTML = options;
  if (currentVal && parseInt(currentVal, 10) <= maxSem) {
    semFilter.value = currentVal;
  }
}

function renderSubjectCards(subjects) {
  const container = document.getElementById('subjectsGrid');
  if (!container) return;

  if (subjects.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-glass);">
        <h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No Subjects Found</h4>
        <p style="color: var(--text-muted);">Try selecting another semester or branch filter.</p>
      </div>
    `;
    return;
  }

  const prefix = window.location.pathname.includes('pages') ? '' : 'pages/';

  container.innerHTML = subjects.map(sub => {
    const hasSyllabus = sub.has_syllabus > 0;
    const sylFileName = sub.syllabus_file_name || '';
    const isDocx = sylFileName.toLowerCase().endsWith('.docx') || sylFileName.toLowerCase().endsWith('.doc');

    let syllabusTag = '';
    if (hasSyllabus) {
      if (isDocx) {
        syllabusTag = `<span style="display:inline-flex; align-items:center; gap:0.3rem; font-size:0.75rem; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.12); padding:0.2rem 0.55rem; border-radius:var(--radius-full); border:1px solid rgba(56,189,248,0.3);">📄 DOCX Syllabus</span>`;
      } else {
        syllabusTag = `<span style="display:inline-flex; align-items:center; gap:0.3rem; font-size:0.75rem; font-weight:700; color:#f87171; background:rgba(248,113,113,0.12); padding:0.2rem 0.55rem; border-radius:var(--radius-full); border:1px solid rgba(248,113,113,0.3);">📑 PDF Syllabus</span>`;
      }
    } else {
      syllabusTag = `<span style="font-size:0.75rem; font-weight:600; color:var(--text-dim); background:rgba(255,255,255,0.05); padding:0.2rem 0.55rem; border-radius:var(--radius-full);">Syllabus Pending</span>`;
    }

    return `
      <div class="card-item">
        <div class="card-header">
          <div class="card-icon">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            ${syllabusTag}
            <span class="badge-tag badge-sem">Sem ${FTechApp.escapeHtml(sub.semester)} • ${FTechApp.escapeHtml(sub.branch)}</span>
          </div>
        </div>

        <div class="card-code">${FTechApp.escapeHtml(sub.code)}</div>
        <h3 class="card-title">${FTechApp.escapeHtml(sub.title)}</h3>
        <p class="card-desc">${FTechApp.escapeHtml(sub.description || 'AKTU official academic curriculum syllabus and modules structure.')}</p>

        <div class="card-meta">
          <div class="meta-item">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>${FTechApp.escapeHtml(sub.credits)} Credits</span>
          </div>
          <div class="meta-item">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>5 Units / Modules</span>
          </div>
        </div>

        <div class="card-footer" style="display:flex; gap:0.5rem;">
          <a href="${prefix}subject.html?code=${encodeURIComponent(sub.code)}" class="btn btn-primary btn-sm" style="flex: 1;">
            Explore Syllabus
          </a>
          ${hasSyllabus ? `
            <button onclick="FTechApp.triggerDownload(${sub.syllabus_doc_id}, '${FTechApp.escapeHtml(sub.title)} Syllabus')" class="btn btn-secondary btn-sm" title="Download Syllabus" style="cursor:pointer;">
              ⬇️ File
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 2. DETAILED SUBJECT & SEMESTERS EXPLORER VIEW (subject.html?code=...)
// --------------------------------------------------------------------------
async function loadSubjectDetails() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code') || 'KCS-301';

  const container = document.getElementById('subjectDetailView');
  if (!container) return;

  const res = await FTechApp.apiCall(`/api/subjects/${encodeURIComponent(code)}`);
  if (!res.success || !res.data) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--accent-rose);">
        <h3>Subject Not Found</h3>
        <p style="margin: 1rem 0;">The requested subject code does not exist in the curriculum database.</p>
        <a href="subject.html" class="btn btn-secondary btn-sm">&larr; Return to Subjects List</a>
      </div>
    `;
    return;
  }

  currentSubjectData = res.data;
  const sub = res.data;
  document.title = `${sub.code} - ${sub.title} | Syllabus & Curriculum | F-TECH`;

  // Update Hero elements
  const titleEl = document.getElementById('subTitle');
  const codeEl = document.getElementById('subCode');
  const descEl = document.getElementById('subDesc');
  const semEl = document.getElementById('subSem');
  const creditsEl = document.getElementById('subCredits');

  if (titleEl) titleEl.textContent = sub.title;
  if (codeEl) codeEl.textContent = sub.code;
  if (descEl) descEl.textContent = sub.description || 'Comprehensive AKTU university syllabus specifications and unit-by-unit curriculum guidelines.';
  if (semEl) semEl.textContent = `Semester ${sub.semester} • ${sub.branch}`;
  if (creditsEl) creditsEl.textContent = `${sub.credits} Academic Credits`;

  // Check admin authorization for quick upload button
  checkAdminPrivilegesForSyllabus(sub);

  // SECTION 1: Render Official Syllabus Document (DOCX / PDF)
  renderOfficialSyllabusCard(sub.syllabus, sub);

  // SECTION 2: Setup Dynamic Semesters Navigator (Semesters 1 to 8+)
  totalConfiguredSemesters = sub.totalSemesters || 8;
  const maxBadge = document.getElementById('maxSemCountBadge');
  if (maxBadge) maxBadge.textContent = `Semesters 1 to ${totalConfiguredSemesters}`;

  activeSemesterNumber = sub.semester;
  renderSemesterTabs(activeSemesterNumber, totalConfiguredSemesters);
  loadSemesterCurriculum(activeSemesterNumber);
}

function checkAdminPrivilegesForSyllabus(sub) {
  const quickUploadBtn = document.getElementById('adminSyllabusQuickUpload');
  if (!quickUploadBtn) return;

  const adminToken = localStorage.getItem('ftech_admin_token');
  const userStr = localStorage.getItem('ftech_user');
  let isAdmin = false;

  if (adminToken) {
    isAdmin = true;
  } else if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'Admin' || user.role === 'SuperAdmin') isAdmin = true;
    } catch (e) {}
  }

  if (isAdmin) {
    quickUploadBtn.style.display = 'block';
  } else {
    quickUploadBtn.style.display = 'none';
  }
}

function renderOfficialSyllabusCard(syllabus, subject) {
  const contentEl = document.getElementById('officialSyllabusDocContent');
  const badgeContainer = document.getElementById('syllabusDocBadgeContainer');
  if (!contentEl) return;

  if (syllabus) {
    const isDocx = (syllabus.file_name || '').toLowerCase().endsWith('.docx') || (syllabus.file_name || '').toLowerCase().endsWith('.doc');
    const badgeHtml = isDocx
      ? `<span class="badge-tag" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-weight:700; padding:0.35rem 0.8rem; font-size:0.82rem;">DOCX • Microsoft Word</span>`
      : `<span class="badge-tag" style="background:rgba(248,113,113,0.15); color:#f87171; border:1px solid rgba(248,113,113,0.3); font-weight:700; padding:0.35rem 0.8rem; font-size:0.82rem;">PDF • Adobe Acrobat</span>`;

    if (badgeContainer) badgeContainer.innerHTML = badgeHtml;

    contentEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:var(--radius-md); padding:1.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem;">
        <div style="display:flex; align-items:center; gap:1.25rem; flex:1; min-width:280px;">
          <div style="width:54px; height:54px; border-radius:var(--radius-md); background:${isDocx ? 'rgba(56,189,248,0.15)' : 'rgba(248,113,113,0.15)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.75rem;">
            ${isDocx ? '📝' : '📕'}
          </div>
          <div>
            <h4 style="font-size:1.15rem; font-weight:700; margin-bottom:0.3rem; color:var(--text-main);">
              ${FTechApp.escapeHtml(syllabus.title || `${subject.code} Official Syllabus`)}
            </h4>
            <div style="display:flex; align-items:center; gap:0.85rem; font-size:0.82rem; color:var(--text-muted); flex-wrap:wrap;">
              <span style="font-family:'JetBrains Mono', monospace; color:#cbd5e1;">${FTechApp.escapeHtml(syllabus.file_name)}</span>
              <span>•</span>
              <span>${formatFileSize(syllabus.file_size)}</span>
              <span>•</span>
              <span style="color:var(--accent-emerald); font-weight:600;">🛡️ Verified Administrator Upload</span>
              <span>•</span>
              <span>${syllabus.downloads_count || 0} Downloads</span>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
          <button onclick="FTechApp.triggerDownload(${syllabus.id}, '${FTechApp.escapeHtml(currentSubjectData.title)} Official Syllabus')" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.65rem 1.4rem; cursor:pointer;">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Download Syllabus (${isDocx ? 'DOCX' : 'PDF'})</span>
          </button>
          <a href="document-viewer.html?id=${syllabus.id}" class="btn btn-secondary" style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.65rem 1.25rem;">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span>Preview Document</span>
          </a>
        </div>
      </div>
    `;
  } else {
    if (badgeContainer) {
      badgeContainer.innerHTML = `<span style="font-size:0.8rem; font-weight:600; color:var(--accent-amber); background:rgba(245,158,11,0.12); padding:0.35rem 0.75rem; border-radius:var(--radius-full); border:1px solid rgba(245,158,11,0.25);">Official File Pending</span>`;
    }

    contentEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border-glass); border-radius:var(--radius-md); padding:2.25rem; text-align:center;">
        <div style="font-size:2.5rem; margin-bottom:0.75rem;">📋</div>
        <h4 style="font-size:1.15rem; font-weight:700; margin-bottom:0.4rem; color:var(--text-main);">
          Official Syllabus Document is Being Prepared
        </h4>
        <p style="font-size:0.85rem; color:var(--text-muted); max-width:550px; margin:0 auto 1.25rem auto;">
          The official docx/pdf syllabus file for <strong>${FTechApp.escapeHtml(subject.code)} (${FTechApp.escapeHtml(subject.title)})</strong> is uploaded directly by academic administrators. Please check back shortly.
        </p>
        <button onclick="openSubjectSyllabusUploadModal()" class="btn btn-primary btn-sm admin-only-upload-btn" style="display:inline-flex; align-items:center; gap:0.4rem;">
          <span>+ Upload Syllabus File (Admin)</span>
        </button>
      </div>
    `;

    // Only display upload button if admin
    const adminToken = localStorage.getItem('ftech_admin_token');
    const uploadBtn = contentEl.querySelector('.admin-only-upload-btn');
    if (uploadBtn && !adminToken) {
      uploadBtn.style.display = 'none';
    }
  }
}

// --------------------------------------------------------------------------
// 3. DYNAMIC SEMESTERS NAVIGATOR (Semesters 1 to 8+)
// --------------------------------------------------------------------------
function renderSemesterTabs(activeSem, totalSem) {
  const container = document.getElementById('semesterTabsContainer');
  if (!container) return;

  const count = Math.max(8, totalSem || 8);
  let html = '';

  for (let s = 1; s <= count; s++) {
    const isActive = s === parseInt(activeSem, 10);
    html += `
      <button 
        type="button" 
        onclick="switchSelectedSemester(${s})" 
        class="semester-tab-btn" 
        data-sem="${s}"
        style="
          padding: 0.55rem 1.15rem;
          border-radius: var(--radius-full);
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition-smooth);
          border: 1px solid ${isActive ? 'transparent' : 'var(--border-glass)'};
          background: ${isActive ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.04)'};
          color: ${isActive ? '#ffffff' : 'var(--text-muted)'};
          box-shadow: ${isActive ? '0 4px 15px rgba(99, 102, 241, 0.35)' : 'none'};
        "
      >
        Semester ${s}
      </button>
    `;
  }

  container.innerHTML = html;
}

async function switchSelectedSemester(semester) {
  activeSemesterNumber = semester;
  renderSemesterTabs(activeSemesterNumber, totalConfiguredSemesters);
  loadSemesterCurriculum(semester);
}

async function loadSemesterCurriculum(semester) {
  const listContainer = document.getElementById('semesterSubjectsList');
  const titleEl = document.getElementById('currentSelectedSemTitle');
  const countEl = document.getElementById('currentSelectedSemCount');
  if (!listContainer) return;

  if (titleEl) titleEl.textContent = `Semester ${semester} Curriculum Subjects & Syllabus`;
  if (countEl) countEl.textContent = 'Loading subjects...';

  listContainer.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">
      <div class="spinner" style="margin-bottom: 0.5rem;">⚡</div>
      <p>Loading Semester ${semester} syllabus...</p>
    </div>
  `;

  const res = await FTechApp.apiCall(`/api/subjects?semester=${semester}`);
  if (res.success && res.data) {
    const subjects = res.data;
    if (countEl) countEl.textContent = `${subjects.length} Subjects in Semester ${semester}`;

    if (subjects.length === 0) {
      listContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <h4 style="font-size: 1.1rem; margin-bottom: 0.35rem; color: var(--text-main);">No Subjects Registered for Semester ${semester}</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Administrative curriculum addition in progress.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = subjects.map(s => {
      const isCurrentCode = currentSubjectData && currentSubjectData.code === s.code;
      const hasSyllabus = s.has_syllabus > 0;
      const isDocx = (s.syllabus_file_name || '').toLowerCase().endsWith('.docx') || (s.syllabus_file_name || '').toLowerCase().endsWith('.doc');

      return `
        <div class="card-item" style="padding:1.35rem; border:${isCurrentCode ? '2px solid var(--primary)' : '1px solid var(--border-glass)'}; background:${isCurrentCode ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)'};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span class="card-code" style="font-size:0.95rem;">${FTechApp.escapeHtml(s.code)}</span>
            <span class="badge-tag badge-sem">${FTechApp.escapeHtml(s.branch)} • ${s.credits} Cr</span>
          </div>

          <h4 style="font-size:1.05rem; font-weight:700; margin-bottom:0.5rem; color:var(--text-main);">
            ${FTechApp.escapeHtml(s.title)}
          </h4>

          <div style="margin-bottom:1rem;">
            ${hasSyllabus ? `
              <div style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.75rem; font-weight:700; color:${isDocx ? '#38bdf8' : '#f87171'}; background:${isDocx ? 'rgba(56,189,248,0.1)' : 'rgba(248,113,113,0.1)'}; padding:0.25rem 0.6rem; border-radius:var(--radius-full); border:1px solid ${isDocx ? 'rgba(56,189,248,0.25)' : 'rgba(248,113,113,0.25)'};">
                <span>${isDocx ? '📝 Official DOCX' : '📕 Official PDF'}</span>
              </div>
            ` : `
              <span style="font-size:0.75rem; color:var(--text-dim); background:rgba(255,255,255,0.04); padding:0.2rem 0.5rem; border-radius:var(--radius-full);">
                Syllabus Pending
              </span>
            `}
          </div>

          <div style="display:flex; gap:0.5rem; margin-top:auto;">
            ${isCurrentCode ? `
              <span class="btn btn-secondary btn-sm" style="flex:1; cursor:default; opacity:0.8; font-size:0.8rem; background:rgba(99,102,241,0.2);">
                Currently Viewing
              </span>
            ` : `
              <a href="subject.html?code=${encodeURIComponent(s.code)}" class="btn btn-secondary btn-sm" style="flex:1; font-size:0.8rem;">
                Explore Syllabus
              </a>
            `}

            ${hasSyllabus ? `
              <button onclick="FTechApp.triggerDownload(${s.syllabus_doc_id}, '${FTechApp.escapeHtml(s.title)} Official Syllabus')" class="btn btn-primary btn-sm" style="font-size:0.8rem; cursor:pointer;" title="Download Official Syllabus">
                ⬇️ Download
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

// --------------------------------------------------------------------------
// 4. ADMIN SYLLABUS UPLOAD MODAL HANDLING (DOCX / PDF)
// --------------------------------------------------------------------------
function openSubjectSyllabusUploadModal() {
  if (!currentSubjectData) return;
  const modal = document.getElementById('subjectSyllabusModal');
  const codeInput = document.getElementById('modalSylSubCode');
  const titleInput = document.getElementById('modalSylTitle');

  if (codeInput) codeInput.value = currentSubjectData.code;
  if (titleInput) titleInput.value = `${currentSubjectData.code} Official AKTU Syllabus & Course Curriculum`;

  // Wire up drop zone
  const dropZone = document.getElementById('modalSylDropZone');
  const fileInput = document.getElementById('modalSylFileInput');
  const fileNameEl = document.getElementById('modalSylFileName');

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'doc'].includes(ext)) {
          FTechApp.showToast('Invalid file format. Only DOCX (.docx) and PDF (.pdf) files are allowed for syllabus.', 'error');
          fileInput.value = '';
          fileNameEl.textContent = '';
          return;
        }
        fileNameEl.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
      }
    };
  }

  if (modal) modal.classList.add('active');
}

function closeSubjectSyllabusModal() {
  const modal = document.getElementById('subjectSyllabusModal');
  if (modal) modal.classList.remove('active');
}

async function handleSubjectSyllabusUpload(e) {
  e.preventDefault();
  const fileInput = document.getElementById('modalSylFileInput');
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

  const submitBtn = document.getElementById('modalSylSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading Official Syllabus...';
  }

  const formData = new FormData();
  formData.append('title', document.getElementById('modalSylTitle').value.trim());
  formData.append('type', 'syllabus');
  formData.append('subject_code', currentSubjectData.code);
  formData.append('semester', currentSubjectData.semester);
  formData.append('branch', currentSubjectData.branch);
  formData.append('author_name', 'F-TECH Academic Administration');
  formData.append('file', file);

  const token = localStorage.getItem('ftech_admin_token') || localStorage.getItem('ftech_token');

  try {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': FTechApp.API_KEY
      },
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      FTechApp.showToast('Official syllabus uploaded and published successfully!', 'success');
      closeSubjectSyllabusModal();
      // Reload subject details to show the updated syllabus file
      loadSubjectDetails();
    } else {
      FTechApp.showToast(data.message || 'Upload failed', 'error');
    }
  } catch (err) {
    FTechApp.showToast('Upload error: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Official Syllabus';
    }
  }
}

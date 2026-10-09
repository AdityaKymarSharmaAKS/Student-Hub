/**
 * ==========================================================================
 * F-TECH-Student-Hub Subjects Logic
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

let allSubjects = [];

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
    renderSubjectCards(allSubjects);
  } else {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--accent-rose);">
        <p>Failed to load subjects. Please check server connection.</p>
      </div>
    `;
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

  container.innerHTML = subjects.map(sub => `
    <div class="card-item">
      <div class="card-header">
        <div class="card-icon">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <span class="badge-tag badge-sem">Sem ${sub.semester} • ${sub.branch}</span>
      </div>

      <div class="card-code">${sub.code}</div>
      <h3 class="card-title">${sub.title}</h3>
      <p class="card-desc">${sub.description || 'Comprehensive AKTU syllabus coverage with notes, past year papers, and practical labs.'}</p>

      <div class="card-meta">
        <div class="meta-item">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>${sub.credits} Credits</span>
        </div>
        <div class="meta-item">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>5 Units</span>
        </div>
      </div>

      <div class="card-footer">
        <a href="${prefix}subject.html?code=${sub.code}" class="btn btn-secondary btn-sm" style="flex: 1;">
          Explore Syllabus
        </a>
        <a href="${prefix}notes.html?code=${sub.code}" class="btn btn-primary btn-sm" title="View Notes">
          Notes
        </a>
      </div>
    </div>
  `).join('');
}

// Subject Detailed View (on subject.html)
async function loadSubjectDetails() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code') || 'KCS-301';

  const container = document.getElementById('subjectDetailView');
  if (!container) return;

  const res = await FTechApp.apiCall(`/api/subjects/${code}`);
  if (res.success && res.data) {
    const sub = res.data;
    document.title = `${sub.code} - ${sub.title} | F-TECH Student-Hub`;

    const titleEl = document.getElementById('subTitle');
    const codeEl = document.getElementById('subCode');
    const descEl = document.getElementById('subDesc');
    const semEl = document.getElementById('subSem');
    const creditsEl = document.getElementById('subCredits');

    if (titleEl) titleEl.textContent = sub.title;
    if (codeEl) codeEl.textContent = sub.code;
    if (descEl) descEl.textContent = sub.description;
    if (semEl) semEl.textContent = `Semester ${sub.semester} • ${sub.branch}`;
    if (creditsEl) creditsEl.textContent = `${sub.credits} Academic Credits`;

    // Render associated papers
    const papersContainer = document.getElementById('subjectPapersList');
    if (papersContainer) {
      const papers = sub.documents.filter(d => d.type === 'aktu-paper');
      if (papers.length === 0) {
        papersContainer.innerHTML = '<p style="color: var(--text-dim);">No previous year papers uploaded yet for this code.</p>';
      } else {
        papersContainer.innerHTML = papers.map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.85rem; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); margin-bottom:0.5rem; border:1px solid var(--border-glass);">
            <div>
              <strong style="display:block;">${p.title}</strong>
              <small style="color:var(--text-dim);">${p.year ? `Year ${p.year} • ` : ''}${p.downloads_count} downloads</small>
            </div>
            <a href="document-viewer.html?id=${p.id}" class="btn btn-primary btn-sm">Preview / Download</a>
          </div>
        `).join('');
      }
    }

    // Render associated notes
    const notesContainer = document.getElementById('subjectNotesList');
    if (notesContainer) {
      const notes = sub.documents.filter(d => d.type === 'notes');
      if (notes.length === 0) {
        notesContainer.innerHTML = '<p style="color: var(--text-dim);">No notes uploaded yet for this code.</p>';
      } else {
        notesContainer.innerHTML = notes.map(n => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.85rem; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); margin-bottom:0.5rem; border:1px solid var(--border-glass);">
            <div>
              <strong style="display:block;">${n.title}</strong>
              <small style="color:var(--text-dim);">Unit ${n.unit} • ${n.author_name}</small>
            </div>
            <a href="document-viewer.html?id=${n.id}" class="btn btn-secondary btn-sm">Read Notes</a>
          </div>
        `).join('');
      }
    }
  }
}

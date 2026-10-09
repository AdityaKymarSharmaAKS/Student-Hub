/**
 * ==========================================================================
 * F-TECH-Student-Hub Documents & Papers Logic
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

let activeDocuments = [];

async function loadDocuments(filters = {}) {
  const container = document.getElementById('documentsGrid');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
      <div class="spinner" style="margin-bottom: 1rem;">⚡</div>
      <p>Fetching verified F-TECH resources...</p>
    </div>
  `;

  const query = new URLSearchParams(filters).toString();
  const res = await FTechApp.apiCall(`/api/documents?${query}`);

  if (res.success && res.data) {
    activeDocuments = res.data;
    renderDocumentCards(activeDocuments);
  } else {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--accent-rose);">
        <p>Could not load documents. Please retry.</p>
      </div>
    `;
  }
}

function renderDocumentCards(docs) {
  const container = document.getElementById('documentsGrid');
  if (!container) return;

  if (docs.length === 0) {
    const isPages = window.location.pathname.includes('pages');
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4.5rem 2rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-glass);">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📂</div>
        <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">No Documents Uploaded Yet</h4>
        <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 480px; margin: 0 auto 1.5rem;">
          Verified study notes and AKTU previous year question papers will appear here as soon as they are uploaded.
        </p>
        <button onclick="typeof FTechUploads !== 'undefined' ? FTechUploads.openModal() : (window.location.href='${isPages ? '../index.html' : 'index.html'}')" class="btn btn-primary btn-sm">
          + Upload Material
        </button>
      </div>
    `;
    return;
  }

  const prefix = window.location.pathname.includes('pages') ? '' : 'pages/';

  container.innerHTML = docs.map(doc => {
    const isPaper = doc.type === 'aktu-paper';
    const badgeClass = isPaper ? 'badge-aktu' : 'badge-notes';
    const badgeLabel = isPaper ? `AKTU PYQ ${doc.year || ''}` : `Unit ${doc.unit || 'All'} Notes`;

    return `
      <div class="card-item">
        <div class="card-header">
          <div class="card-icon" style="${isPaper ? 'color: var(--accent-amber); background: rgba(245, 158, 11, 0.12);' : ''}">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span class="badge-tag ${badgeClass}">${badgeLabel}</span>
        </div>

        <div class="card-code">${doc.subject_code} • Sem ${doc.semester}</div>
        <h3 class="card-title">${doc.title}</h3>
        <p class="card-desc">Author/Verified by: ${doc.author_name || 'Aditya Kumar Sharma (F-TECH)'}</p>

        <div class="card-meta">
          <div class="meta-item">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span>${doc.views_count} views</span>
          </div>
          <div class="meta-item">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
            <span>${doc.rating} ★</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="download-counter">
            <strong>${doc.downloads_count}</strong> downloads
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <a href="${prefix}document-viewer.html?id=${doc.id}" class="btn btn-secondary btn-sm" title="View Document">
              Preview
            </a>
            <button onclick="downloadDoc(${doc.id})" class="btn btn-primary btn-sm" title="Direct Download">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function downloadDoc(id) {
  FTechApp.showToast('Preparing download from F-TECH servers...', 'info');
  window.location.href = `${FTechApp.API_BASE}/api/documents/${id}/download`;
}

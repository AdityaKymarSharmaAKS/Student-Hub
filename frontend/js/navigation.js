/**
 * ==========================================================================
 * F-TECH-Student-Hub Navigation & UI Handlers
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Sidebar Toggle
  const sidebar = document.querySelector('.app-sidebar');
  const toggleBtn = document.querySelector('.mobile-toggle');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Active Route Highlighter
  const currentPath = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll('.nav-item');

  navLinks.forEach(link => {
    const href = link.getAttribute('href') ? link.getAttribute('href').toLowerCase() : '';
    if (href && (currentPath.endsWith(href) || (href === 'index.html' && (currentPath.endsWith('/') || currentPath.endsWith('student-hub-1') || currentPath.endsWith('index.html'))))) {
      link.classList.add('active');
    }
  });

  // Semester Quick Switcher Buttons in Sidebar
  const semBtns = document.querySelectorAll('.sem-btn');
  semBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sem = btn.getAttribute('data-sem');
      semBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // If on notes or papers page, trigger filter
      if (typeof window.filterBySemester === 'function') {
        window.filterBySemester(sem);
      } else {
        // Navigate with query param
        const targetPage = window.location.pathname.includes('aktu-papers') 
          ? 'aktu-papers.html' 
          : (window.location.pathname.includes('pages') ? 'notes.html' : 'pages/notes.html');
        window.location.href = `${targetPage}?sem=${sem}`;
      }
    });
  });

  // Global Search Input
  const globalSearchInput = document.getElementById('globalSearchInput');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalSearchInput.value.trim();
        if (query) {
          const target = window.location.pathname.includes('pages') ? 'notes.html' : 'pages/notes.html';
          window.location.href = `${target}?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }

  // Keyboard shortcut Ctrl+K to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (globalSearchInput) {
        globalSearchInput.focus();
        globalSearchInput.select();
      }
    }
  });
});

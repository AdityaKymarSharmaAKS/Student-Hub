/**
 * ==========================================================================
 * F-TECH-Student-Hub File Upload Handler
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const uploadModal = document.getElementById('uploadModal');
  const openUploadBtns = document.querySelectorAll('.open-upload-modal');
  const closeUploadBtn = document.getElementById('closeUploadModal');
  const uploadForm = document.getElementById('studentUploadForm');
  const fileInput = document.getElementById('uploadFileInput');
  const fileDropZone = document.getElementById('fileDropZone');
  const selectedFileName = document.getElementById('selectedFileName');

  // Open Modal
  openUploadBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (uploadModal) uploadModal.classList.add('active');
    });
  });

  // Close Modal
  if (closeUploadBtn && uploadModal) {
    closeUploadBtn.addEventListener('click', () => {
      uploadModal.classList.remove('active');
    });

    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) {
        uploadModal.classList.remove('active');
      }
    });
  }

  // File Dropzone & Selection
  if (fileDropZone && fileInput) {
    fileDropZone.addEventListener('click', () => fileInput.click());

    fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropZone.style.borderColor = 'var(--primary)';
      fileDropZone.style.background = 'rgba(99, 102, 241, 0.08)';
    });

    fileDropZone.addEventListener('dragleave', () => {
      fileDropZone.style.borderColor = 'var(--border-glass)';
      fileDropZone.style.background = 'rgba(255, 255, 255, 0.02)';
    });

    fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropZone.style.borderColor = 'var(--border-glass)';
      fileDropZone.style.background = 'rgba(255, 255, 255, 0.02)';

      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        updateFileLabel();
      }
    });

    fileInput.addEventListener('change', updateFileLabel);
  }

  function updateFileLabel() {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      if (selectedFileName) {
        selectedFileName.textContent = `Selected: ${file.name} (${sizeMB} MB)`;
        selectedFileName.style.color = 'var(--secondary)';
      }
    }
  }

  // Form Submission
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('uploadTitle').value.trim();
      const type = document.getElementById('uploadType').value;
      const subjectCode = document.getElementById('uploadSubjectCode').value.trim();
      const semester = document.getElementById('uploadSemester').value;
      const branch = document.getElementById('uploadBranch').value;
      const authorName = document.getElementById('uploadAuthor').value.trim();

      if (!title || !subjectCode) {
        FTechApp.showToast('Please fill in required fields.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      formData.append('subject_code', subjectCode);
      formData.append('semester', semester);
      formData.append('branch', branch);
      formData.append('author_name', authorName || 'F-TECH Student Contributor');

      if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
      }

      const submitBtn = uploadForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Uploading to F-TECH...';

      try {
        const response = await fetch(`${FTechApp.API_BASE}/api/documents/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          FTechApp.showToast('Material submitted successfully to F-TECH Student-Hub!', 'success');
          uploadForm.reset();
          if (selectedFileName) selectedFileName.textContent = '';
          if (uploadModal) uploadModal.classList.remove('active');

          if (typeof loadDocuments === 'function') {
            loadDocuments();
          }
        } else {
          FTechApp.showToast(data.message || 'Upload failed', 'error');
        }
      } catch (err) {
        FTechApp.showToast('Upload failed: ' + err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});

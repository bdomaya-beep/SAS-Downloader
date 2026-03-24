const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const filesList = document.getElementById('filesList');
const refreshBtn = document.getElementById('refreshBtn');

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function setStatus(message, isError = false) {
  uploadStatus.textContent = message;
  uploadStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Link copied!');
  } catch {
    alert('Copy failed. You can copy manually:\n' + text);
  }
}

async function deleteFile(id) {
  const ok = confirm('Delete this file?');
  if (!ok) return;

  const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Delete failed');
    return;
  }

  await loadFiles();
}

function renderFiles(files) {
  if (!files.length) {
    filesList.innerHTML = '<div class="empty">No uploaded files yet.</div>';
    return;
  }

  filesList.innerHTML = files
    .map((file) => {
      const uploadedDate = new Date(file.uploadedAt).toLocaleString();
      return `
        <article class="file-item">
          <div class="file-top">
            <div class="file-name">${file.originalName}</div>
            <div class="file-meta">${formatBytes(file.size)} • ${file.downloads} downloads</div>
          </div>
          <div class="file-meta">Uploaded: ${uploadedDate}</div>
          <div class="file-actions">
            <button class="download-btn" data-download="${file.downloadUrl}">Download</button>
            <button class="copy-btn" data-share="${file.shareUrl}">Copy share link</button>
            <button class="delete-btn" data-delete="${file.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');

  filesList.querySelectorAll('[data-download]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.open(btn.getAttribute('data-download'), '_blank');
    });
  });

  filesList.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => {
      copyToClipboard(btn.getAttribute('data-share'));
    });
  });

  filesList.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteFile(btn.getAttribute('data-delete'));
    });
  });
}

async function loadFiles() {
  const res = await fetch('/api/files');
  const data = await res.json();
  if (!res.ok) {
    filesList.innerHTML = '<div class="empty">Failed to load files.</div>';
    return;
  }

  renderFiles(data.files || []);
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    setStatus('Please choose a file first.', true);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  setStatus('Uploading...');

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Upload failed.', true);
      return;
    }

    setStatus('Upload complete. Share link ready.');
    fileInput.value = '';
    await loadFiles();
  } catch {
    setStatus('Upload failed. Please try again.', true);
  }
});

refreshBtn.addEventListener('click', loadFiles);

loadFiles();

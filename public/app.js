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

  const res = await fetch(`/api/delete/${id}`, { method: 'DELETE' });
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
            <div class="file-meta">${formatBytes(file.size)} • ${file.downloads || 0} downloads</div>
          </div>
          <div class="file-meta">Uploaded: ${uploadedDate}</div>
          <div class="file-actions">
            <button class="download-btn" data-download="${file.publicUrl || file.downloadUrl}">Download</button>
            <button class="copy-btn" data-share="${file.publicUrl || file.shareUrl}">Copy share link</button>
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

  setStatus('Uploading...');

  try {
    // 1) ask server for presigned URL
    const presignResp = await fetch('/api/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, contentType: file.type || 'application/octet-stream' })
    });
    let presign;
    try {
      presign = await presignResp.json();
    } catch (e) {
      const txt = await presignResp.text();
      setStatus(`Presign response not JSON: ${txt}`, true);
      return;
    }
    if (!presignResp.ok) {
      setStatus(presign.error || 'Could not get upload URL.', true);
      return;
    }

    // 2) PUT file directly to S3
    const put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!put.ok) {
      const putText = await put.text();
      setStatus(`Upload to storage failed: ${put.status} ${putText}`, true);
      return;
    }

    // 3) notify server to record metadata
    const recordResp = await fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: presign.key, originalName: file.name, size: file.size, mimeType: file.type, publicUrl: presign.publicUrl })
    });
    let recordData;
    try {
      recordData = await recordResp.json();
    } catch (e) {
      const txt = await recordResp.text();
      setStatus(`Record response not JSON: ${txt}`, true);
      return;
    }
    if (!recordResp.ok) {
      setStatus(recordData.error || 'Upload record failed.', true);
      return;
    }

    setStatus('Upload complete. Share link ready.');
    fileInput.value = '';
    await loadFiles();
  } catch (err) {
    console.error('upload error', err);
    setStatus('Upload failed. Please try again.', true);
  }
});

refreshBtn.addEventListener('click', loadFiles);

loadFiles();

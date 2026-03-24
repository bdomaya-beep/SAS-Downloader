const uploadStatus = document.getElementById('uploadStatus');
const filesList = document.getElementById('filesList');
const refreshBtn = document.getElementById('refreshBtn');
const detailsModal = document.getElementById('detailsModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

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
  if (!uploadStatus) return;
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
      // icon support: use file.iconUrl if present
      const iconHtml = file.iconUrl ? `<img class="file-icon" src="${file.iconUrl}" alt="icon"/>` : '';
      return `
        <article class="file-item">
          <div class="file-top">
            <div style="display:flex;align-items:center;gap:.6rem">
              ${iconHtml}
              <div>
                <div class="file-name">${file.originalName}</div>
                <div class="file-meta">Uploaded: ${uploadedDate}</div>
              </div>
            </div>
            <div class="file-meta">${formatBytes(file.size)} • ${file.downloads || 0} downloads ${file.isLatest ? '<span class="badge">Latest</span>' : ''}</div>
          </div>
          ${file.description ? `<div class="file-desc">${escapeHtml(file.description)}</div>` : ''}
          <div class="file-actions">
            <button class="download-btn" data-download="/api/download?id=${file.id}">Download</button>
            <button class="copy-btn" data-share="${file.publicUrl || file.shareUrl}">Copy share link</button>
            <button class="details-btn" data-id="${file.id}">Details</button>
          </div>
        </article>
      `;
    })
    .join('');

  filesList.querySelectorAll('[data-download]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // route through our download endpoint so downloads are recorded
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

  // details button handlers
  filesList.querySelectorAll('.details-btn').forEach((btn) => btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-id');
    const res = await fetch('/api/files');
    const data = await res.json();
    const file = (data.files || []).find(f => f.id === id);
    if (!file) return alert('File not found');
    // build modal content
    const historyHtml = (file.history || []).map(h => `<li><strong>${escapeHtml(h.version||'')}</strong> — ${escapeHtml(h.note||'')} <em>(${new Date(h.when).toLocaleString()})</em></li>`).join('');
    modalBody.innerHTML = `
      <div style="display:flex;gap:1rem;align-items:flex-start">
        ${file.iconUrl ? `<img src="${file.iconUrl}" class="file-icon large"/>` : ''}
        <div>
          <h3 style="margin:0 0 .35rem">${escapeHtml(file.originalName)}</h3>
          <div class="file-meta">Size: ${formatBytes(file.size)} • ${file.downloads || 0} downloads</div>
          ${file.description ? `<p class="file-desc">${escapeHtml(file.description)}</p>` : ''}
          ${file.version ? `<div><strong>Version:</strong> ${escapeHtml(file.version)}</div>` : ''}
        </div>
      </div>
      ${historyHtml ? `<details style="margin-top:.75rem"><summary>Changelog (${(file.history||[]).length})</summary><ul>${historyHtml}</ul></details>` : ''}
      <div style="margin-top:1rem">
        <button onclick="window.open('/api/download?id=${file.id}','_blank')">Download</button>
        <button onclick="navigator.clipboard.writeText('${file.publicUrl || file.shareUrl}')">Copy link</button>
      </div>
    `;
    detailsModal.style.display = 'block';
  }));
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

// modal close
if (modalClose) modalClose.addEventListener('click', () => { detailsModal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === detailsModal) detailsModal.style.display = 'none'; });

// helper to avoid XSS when showing descriptions
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

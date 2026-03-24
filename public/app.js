const filesList = document.getElementById('filesList');
const refreshBtn = document.getElementById('refreshBtn');
const detailsModal = document.getElementById('detailsModal');
const detailsBody = document.getElementById('detailsBody');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');

let filesCache = [];

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

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Link copied!');
  } catch {
    alert('Copy failed. You can copy manually:\n' + text);
  }
}

function renderFiles(files) {
  if (!files.length) {
    filesList.innerHTML = '<div class="empty">No files are available yet.</div>';
    return;
  }

  filesList.innerHTML = files
    .map((file) => {
      const uploadedDate = new Date(file.uploadedAt).toLocaleString();
      const downloadTarget = file.downloadUrl || `/api/download?id=${file.id}`;
      return `
        <article class="file-item">
          <div class="file-top">
            <div class="file-name">${file.originalName}</div>
            <div class="file-meta">${formatBytes(file.size)} • ${file.downloads || 0} downloads ${file.isLatest ? '<span class="badge">Latest</span>' : ''}</div>
          </div>
          <div class="file-meta">Uploaded: ${uploadedDate}</div>
          ${file.description ? `<div class="file-desc">${escapeHtml(file.description)}</div>` : ''}
          <div class="file-actions">
            <button class="download-btn" data-download="${downloadTarget}">Download</button>
            <button class="copy-btn" data-share="${file.publicUrl || file.shareUrl}">Copy share link</button>
            <button class="ghost-btn" data-details="${file.id}">Details</button>
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

  filesList.querySelectorAll('[data-details]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openDetails(btn.getAttribute('data-details'));
    });
  });
}

function openDetails(id) {
  const file = filesCache.find((entry) => entry.id === id);
  if (!file) return;

  const history = (file.history || []).slice().sort((a, b) => new Date(b.when) - new Date(a.when));
  const releaseNotes = file.releaseNotes || (history[0] && history[0].note) || '';

  detailsBody.innerHTML = `
    <article class="detail-grid">
      <div class="detail-row"><span class="detail-label">File Name</span><span>${escapeHtml(file.originalName || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">Version</span><span>${escapeHtml(file.version || 'Not specified')}</span></div>
      <div class="detail-row"><span class="detail-label">Size</span><span>${formatBytes(file.size)}</span></div>
      <div class="detail-row"><span class="detail-label">Downloads</span><span>${file.downloads || 0}</span></div>
      <div class="detail-row"><span class="detail-label">Uploaded</span><span>${new Date(file.uploadedAt).toLocaleString()}</span></div>
      <div class="detail-row"><span class="detail-label">Latest</span><span>${file.isLatest ? 'Yes' : 'No'}</span></div>
    </article>
    <section class="detail-section">
      <h4>What was updated</h4>
      <p>${escapeHtml(releaseNotes || 'No update details provided yet.')}</p>
    </section>
    <section class="detail-section">
      <h4>Description</h4>
      <p>${escapeHtml(file.description || 'No description provided.')}</p>
    </section>
    <section class="detail-section">
      <h4>Version History</h4>
      ${history.length
        ? `<ul class="history-list">${history
            .map(
              (entry) =>
                `<li><strong>${escapeHtml(entry.version || '—')}</strong> — ${escapeHtml(entry.note || 'No details')} <span>${new Date(entry.when).toLocaleString()}</span></li>`
            )
            .join('')}</ul>`
        : '<p>No history entries yet.</p>'}
    </section>
  `;

  detailsModal.classList.add('open');
  detailsModal.setAttribute('aria-hidden', 'false');
}

function closeDetails() {
  detailsModal.classList.remove('open');
  detailsModal.setAttribute('aria-hidden', 'true');
}

async function loadFiles() {
  const res = await fetch('/api/files');
  const data = await res.json();
  if (!res.ok) {
    filesList.innerHTML = '<div class="empty">Failed to load files.</div>';
    return;
  }

  filesCache = data.files || [];
  renderFiles(filesCache);
}

refreshBtn.addEventListener('click', loadFiles);
closeDetailsBtn.addEventListener('click', closeDetails);
detailsModal.querySelectorAll('[data-close="details"]').forEach((el) => el.addEventListener('click', closeDetails));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && detailsModal.classList.contains('open')) closeDetails();
});

loadFiles();

// helper to avoid XSS when showing descriptions
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

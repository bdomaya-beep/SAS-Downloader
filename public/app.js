const filesList = document.getElementById('filesList');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const resultsCount = document.getElementById('resultsCount');
const totalFilesStat = document.getElementById('totalFilesStat');
const totalDownloadsStat = document.getElementById('totalDownloadsStat');
const latestVersionStat = document.getElementById('latestVersionStat');
const detailsModal = document.getElementById('detailsModal');
const detailsBody = document.getElementById('detailsBody');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');
const toast = document.getElementById('toast');

let filesCache = [];
let toastTimer;

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
    showToast('Share link copied to clipboard.');
  } catch {
    showToast('Copy failed. You can copy it manually.', true);
  }
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.toggle('error', isError);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.remove('error');
  }, 2200);
}

function renderFiles(files) {
  resultsCount.textContent = `${files.length} file${files.length === 1 ? '' : 's'} shown`;

  if (!files.length) {
    filesList.innerHTML = '<div class="empty">No files match your search yet.</div>';
    return;
  }

  filesList.innerHTML = files
    .map((file) => {
      const uploadedDate = new Date(file.uploadedAt).toLocaleString();
      const downloadTarget = file.downloadUrl || `/api/download?id=${file.id}`;
      const typeLabel = getTypeLabel(file.originalName || '');
      return `
        <article class="file-item">
          <div class="file-top">
            <div class="file-name-wrap">
              <span class="file-type-pill">${typeLabel}</span>
              <div class="file-name">${escapeHtml(file.originalName)}</div>
            </div>
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

function getTypeLabel(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (!ext) return 'FILE';
  if (['apk', 'exe', 'msi', 'dmg'].includes(ext)) return 'APP';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ARCHIVE';
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return 'DOC';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'IMAGE';
  return ext.toUpperCase();
}

function updateOverviewStats(allFiles) {
  const totalFiles = allFiles.length;
  const totalDownloads = allFiles.reduce((sum, file) => sum + (file.downloads || 0), 0);
  const latest = allFiles.find((file) => file.isLatest) || allFiles[0];

  totalFilesStat.textContent = String(totalFiles);
  totalDownloadsStat.textContent = String(totalDownloads);
  latestVersionStat.textContent = latest?.version ? `v${latest.version}` : '—';
}

function getVisibleFiles() {
  const q = searchInput.value.trim().toLowerCase();
  const sortBy = sortSelect.value;

  let items = filesCache.filter((file) => {
    if (!q) return true;
    const haystack = [
      file.originalName || '',
      file.description || '',
      file.version || '',
      file.releaseNotes || ''
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  if (sortBy === 'downloads') {
    items = items.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortBy === 'oldest') {
    items = items.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
  } else if (sortBy === 'name') {
    items = items.sort((a, b) => (a.originalName || '').localeCompare(b.originalName || ''));
  } else {
    items = items.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  return items;
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
    resultsCount.textContent = '';
    return;
  }

  filesCache = data.files || [];
  updateOverviewStats(filesCache);
  renderFiles(getVisibleFiles());
}

refreshBtn.addEventListener('click', loadFiles);
searchInput.addEventListener('input', () => renderFiles(getVisibleFiles()));
sortSelect.addEventListener('change', () => renderFiles(getVisibleFiles()));
closeDetailsBtn.addEventListener('click', closeDetails);
detailsModal.querySelectorAll('[data-close="details"]').forEach((el) => el.addEventListener('click', closeDetails));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && detailsModal.classList.contains('open')) closeDetails();
});

loadFiles();

// helper to avoid XSS when showing descriptions
function escapeHtml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

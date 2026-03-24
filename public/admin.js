const adminPass = document.getElementById('adminPass');
const loginBtn = document.getElementById('loginBtn');
const authStatus = document.getElementById('authStatus');
const adminArea = document.getElementById('adminArea');
const adminList = document.getElementById('adminList');
const refreshAdmin = document.getElementById('refreshAdmin');
const adminUploadForm = document.getElementById('adminUploadForm');
const adminFileInput = document.getElementById('adminFileInput');
const versionInput = document.getElementById('versionInput');
const descriptionInput = document.getElementById('descriptionInput');
const releaseNotesInput = document.getElementById('releaseNotesInput');
const uploadStatus = document.getElementById('uploadStatus');
const adminUploadBtn = document.getElementById('adminUploadBtn');

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function setUploadStatus(message, isError = false) {
  uploadStatus.textContent = message;
  uploadStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

// on load, validate session (cookie or header)
window.addEventListener('load', async () => {
  try {
    // check whether admin is configured
    const s = await fetch('/api/admin-setup', { method: 'GET' });
    const setup = await s.json();
    const configured = setup && setup.configured;
    if (!configured) {
      // show setup mode
      adminPass.placeholder = 'Create a new admin password (min 6 chars)';
      loginBtn.textContent = 'Create Password';
      loginBtn.onclick = async () => {
        const pw = adminPass.value.trim();
        if (!pw || pw.length < 6) {
          setAuthStatus('Password must be at least 6 characters.', true);
          return;
        }
        const resp = await fetch('/api/admin-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }), credentials: 'include' });
        const data = await resp.json();
        if (!resp.ok) {
          setAuthStatus(data.error || 'Setup failed.', true);
          return;
        }
        try { localStorage.setItem('admin_token', data.token); } catch (e) {}
        adminArea.style.display = 'block';
        setAuthStatus('Admin password created. You are signed in.');
        await loadAdminFiles();
      };
      adminArea.style.display = 'none';
      return;
    }

    const v = await fetch('/api/admin-validate', { method: 'GET', credentials: 'include' });
    if (v.ok) {
      adminArea.style.display = 'block';
      setAuthStatus('Session active.');
      await loadAdminFiles();
    } else {
      adminArea.style.display = 'none';
      setAuthStatus('Sign in to continue.');
    }
  } catch (e) {
    adminArea.style.display = 'none';
    setAuthStatus('Could not validate session.', true);
  }
});

loginBtn.addEventListener('click', async () => {
  const currentPass = adminPass.value.trim();
  if (!currentPass) {
    setAuthStatus('Enter admin password.', true);
    return;
  }
  // request token; cookie will be set by server
  try {
    const resp = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: currentPass }), credentials: 'include' });
    const data = await resp.json();
    if (!resp.ok) {
      setAuthStatus(data.error || 'Login failed.', true);
      return;
    }
    // server sets HttpOnly cookie; we can still keep token in localStorage for legacy
    try { localStorage.setItem('admin_token', data.token); } catch (e) {}
    adminArea.style.display = 'block';
    setAuthStatus('Signed in successfully.');
    await loadAdminFiles();
  } catch (e) {
    setAuthStatus('Login failed.', true);
  }
});

refreshAdmin.addEventListener('click', loadAdminFiles);

adminUploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = adminFileInput.files[0];
  const version = versionInput.value.trim();
  const description = descriptionInput.value.trim();
  const releaseNotes = releaseNotesInput.value.trim();

  if (!file) {
    setUploadStatus('Choose a file first.', true);
    return;
  }
  if (!version) {
    setUploadStatus('Version is required.', true);
    return;
  }
  if (!releaseNotes) {
    setUploadStatus('What changed is required.', true);
    return;
  }

  adminUploadBtn.disabled = true;
  setUploadStatus('Preparing upload...');

  try {
    const presignResp = await fetch('/api/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: file.name, contentType: file.type || 'application/octet-stream' })
    });
    const presign = await presignResp.json();
    if (!presignResp.ok) {
      setUploadStatus(presign.error || 'Could not get upload URL.', true);
      return;
    }

    setUploadStatus('Uploading file to storage...');
    const put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!put.ok) {
      const putText = await put.text();
      setUploadStatus(`Storage upload failed: ${put.status} ${putText}`, true);
      return;
    }

    setUploadStatus('Saving metadata...');
    const recordResp = await fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        key: presign.key,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        publicUrl: presign.publicUrl,
        version,
        description,
        releaseNotes
      })
    });
    const recordData = await recordResp.json();
    if (!recordResp.ok) {
      setUploadStatus(recordData.error || 'Could not save record.', true);
      return;
    }

    setUploadStatus('Upload complete and published.');
    adminUploadForm.reset();
    await loadAdminFiles();
  } catch (err) {
    console.error('admin upload error', err);
    setUploadStatus('Upload failed. Try again.', true);
  } finally {
    adminUploadBtn.disabled = false;
  }
});

async function loadAdminFiles() {
  const res = await fetch('/api/files', { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) return alert('Failed to load files');
  renderAdmin(data.files || []);
  renderDashboard(data.files || []);
}

function renderDashboard(files) {
  // total downloads and top 5 files
  const total = files.reduce((s, f) => s + (f.downloads || 0), 0);
  const top = files.slice().sort((a,b)=> (b.downloads||0)-(a.downloads||0)).slice(0,5);
  const intro = document.getElementById('adminDashboard');
  if (!intro) return;
  intro.innerHTML = `
    <section class="card inner-card dashboard-grid">
      <article>
        <h3>${files.length}</h3>
        <p>Total files</p>
      </article>
      <article>
        <h3>${total}</h3>
        <p>Total downloads</p>
      </article>
      <article>
        <h3>${files.filter((f) => f.isLatest).length}</h3>
        <p>Latest-tagged files</p>
      </article>
    </section>
    <section class="card inner-card" style="margin-top:.75rem;">
      <h4>Top files</h4>
      <ol>${top.map(t=>`<li>${escapeHtml(t.originalName)} — ${t.downloads||0}</li>`).join('') || '<li>No downloads yet.</li>'}</ol>
    </section>
  `;
}

function renderAdmin(files) {
  if (!files.length) {
    adminList.innerHTML = '<div class="empty">No uploaded files yet.</div>';
    return;
  }

  adminList.innerHTML = files.map((file) => {
    return `
      <article class="file-item">
        <div class="file-top">
          <div class="file-name">${escapeHtml(file.originalName)}</div>
          <div class="file-meta">${file.isLatest ? '<strong>Latest</strong>' : ''} • ${file.downloads || 0} downloads</div>
        </div>
        <div class="file-meta">Uploaded: ${new Date(file.uploadedAt).toLocaleString()}</div>
        <div class="field-grid" style="margin-top:.5rem">
          <label>
            <span>Version</span>
            <input class="version-input" data-id="${file.id}" placeholder="Version" value="${escapeAttr(file.version || '')}" />
          </label>
          <label>
            <span>Description</span>
            <input class="desc-input" data-id="${file.id}" placeholder="Description" value="${escapeAttr(file.description || '')}" />
          </label>
        </div>
        <label style="margin-top:.5rem; display:block;">
          <span>What changed</span>
          <textarea class="notes-input" data-id="${file.id}" rows="3" placeholder="Release notes">${escapeHtml(file.releaseNotes || '')}</textarea>
        </label>
        <div class="file-actions" style="margin-top:.5rem">
          <button class="mark-latest" data-id="${file.id}">Mark Latest</button>
          <button class="save-meta" data-id="${file.id}">Save Metadata</button>
          <button class="remove" data-id="${file.id}">Delete</button>
        </div>
        ${file.history && file.history.length ? `<details style="margin-top:.5rem"><summary>Changelog (${file.history.length})</summary><ul>${file.history.map(h=>`<li><strong>${h.version||''}</strong> — ${h.note||''} <em>(${new Date(h.when).toLocaleString()})</em></li>`).join('')}</ul></details>` : ''}
      </article>
    `;
  }).join('');

  adminList.querySelectorAll('.mark-latest').forEach((btn) => btn.addEventListener('click', () => adminAction('markLatest', btn.dataset.id)));
  adminList.querySelectorAll('.save-meta').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    const versionField = adminList.querySelector(`input.version-input[data-id="${id}"]`);
    const descField = adminList.querySelector(`input.desc-input[data-id="${id}"]`);
    const notesField = adminList.querySelector(`textarea.notes-input[data-id="${id}"]`);
    adminAction('edit', id, {
      version: versionField.value.trim(),
      description: descField.value.trim(),
      releaseNotes: notesField.value.trim()
    });
  }));
  adminList.querySelectorAll('.remove').forEach((btn) => btn.addEventListener('click', () => {
    if (!confirm('Delete this file?')) return;
    adminAction('delete', btn.dataset.id);
  }));
}

async function adminAction(action, id, fields) {
  const body = { action, id, fields: fields || {} };
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch('/api/admin', { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Action failed');
    return;
  }
  await loadAdminFiles();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

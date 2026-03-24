const adminPass = document.getElementById('adminPass');
const loginBtn = document.getElementById('loginBtn');
const adminArea = document.getElementById('adminArea');
const adminList = document.getElementById('adminList');
const refreshAdmin = document.getElementById('refreshAdmin');

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
        if (!pw || pw.length < 6) return alert('Password must be at least 6 characters');
        const resp = await fetch('/api/admin-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }), credentials: 'include' });
        const data = await resp.json();
        if (!resp.ok) return alert(data.error || 'Setup failed');
        try { localStorage.setItem('admin_token', data.token); } catch (e) {}
        adminArea.style.display = 'block';
        await loadAdminFiles();
      };
      adminArea.style.display = 'none';
      return;
    }

    const v = await fetch('/api/admin-validate', { method: 'GET', credentials: 'include' });
    if (v.ok) {
      adminArea.style.display = 'block';
      await loadAdminFiles();
    } else {
      adminArea.style.display = 'none';
    }
  } catch (e) {
    adminArea.style.display = 'none';
  }
});

loginBtn.addEventListener('click', async () => {
  const currentPass = adminPass.value.trim();
  if (!currentPass) return alert('Enter admin password');
  // request token; cookie will be set by server
  try {
    const resp = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: currentPass }), credentials: 'include' });
    const data = await resp.json();
    if (!resp.ok) return alert(data.error || 'Login failed');
    // server sets HttpOnly cookie; we can still keep token in localStorage for legacy
    try { localStorage.setItem('admin_token', data.token); } catch (e) {}
    adminArea.style.display = 'block';
    await loadAdminFiles();
  } catch (e) {
    alert('Login failed');
  }
});

refreshAdmin.addEventListener('click', loadAdminFiles);

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
  intro.innerHTML = `<div class="card"><h3>Total downloads: ${total}</h3>
    <h4>Top files</h4>
    <ol>${top.map(t=>`<li>${t.originalName} — ${t.downloads||0}</li>`).join('')}</ol></div>`;
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
          <div class="file-name">${file.originalName}</div>
          <div class="file-meta">${file.isLatest ? '<strong>Latest</strong>' : ''} • ${file.downloads || 0} downloads</div>
        </div>
        <div class="file-meta">Uploaded: ${new Date(file.uploadedAt).toLocaleString()}</div>
        <div style="margin-top:.5rem">
          <input class="desc-input" data-id="${file.id}" placeholder="Version / description" value="${(file.description||'').replace(/"/g,'&quot;')}" />
        </div>
        <div class="file-actions" style="margin-top:.5rem">
          <button class="mark-latest" data-id="${file.id}">Mark Latest</button>
          <button class="save-desc" data-id="${file.id}">Save</button>
          <button class="remove" data-id="${file.id}">Delete</button>
        </div>
        ${file.history && file.history.length ? `<details style="margin-top:.5rem"><summary>Changelog (${file.history.length})</summary><ul>${file.history.map(h=>`<li><strong>${h.version||''}</strong> — ${h.note||''} <em>(${new Date(h.when).toLocaleString()})</em></li>`).join('')}</ul></details>` : ''}
      </article>
    `;
  }).join('');

  adminList.querySelectorAll('.mark-latest').forEach((btn) => btn.addEventListener('click', () => adminAction('markLatest', btn.dataset.id)));
  adminList.querySelectorAll('.save-desc').forEach((btn) => btn.addEventListener('click', (e) => {
    const id = btn.dataset.id;
    const input = adminList.querySelector(`input.desc-input[data-id="${id}"]`);
    adminAction('edit', id, { description: input.value });
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
  if (!res.ok) return alert(data.error || 'Action failed');
  await loadAdminFiles();
}

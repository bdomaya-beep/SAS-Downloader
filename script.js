// ============================================
// VITECH SAS DOWNLOADER - Main Script
// ============================================

const API_BASE = '/api';
let appsCache = [];

function hasPublicUI() {
    return !!document.getElementById('apps-container');
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const data = await response.json();
            if (data && data.error) {
                message = data.error;
            }
        } catch {
            // ignore json parse errors
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

async function loadApps() {
    try {
        appsCache = await apiRequest('/apps');
    } catch (error) {
        console.error('Failed to load apps:', error);
        appsCache = [];
    }

    if (hasPublicUI()) {
        renderApps();
        updateStats();
    }

    return appsCache;
}

function renderApps() {
    const container = document.getElementById('apps-container');
    if (!container) return;

    if (!appsCache || appsCache.length === 0) {
        container.innerHTML = '<div class="loading">No apps available yet.</div>';
        return;
    }

    container.innerHTML = appsCache.map(app => `
        <div class="app-card">
            <h3>${app.name}</h3>
            <p class="app-version">Version ${app.version}</p>
            <p class="app-description">${app.description}</p>
            <div class="app-stats">
                <div class="download-count">
                    <span>${app.downloads || 0} download${(app.downloads || 0) !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="app-buttons">
                <a href="#" class="btn btn-primary" onclick="downloadApp(${app.id}, event)">Download</a>
                <button class="btn btn-info" onclick="showAppDetails(${app.id})">Details</button>
            </div>
        </div>
    `).join('');
}

async function downloadApp(appId, event) {
    event.preventDefault();

    const app = appsCache.find(a => a.id === appId);
    if (!app) return;

    try {
        await apiRequest(`/apps/${appId}/download`, { method: 'POST' });
        await loadApps();
    } catch (error) {
        console.error('Download counter update failed:', error);
    }

    const link = document.createElement('a');
    link.href = app.downloadUrl;
    link.download = app.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`${app.name} is downloading...`, 'success');
}

function showAppDetails(appId) {
    const app = appsCache.find(a => a.id === appId);
    if (!app) return;

    document.getElementById('modal-title').textContent = app.name;
    document.getElementById('modal-description').textContent = app.description;
    document.getElementById('modal-version').textContent = `v${app.version}`;
    document.getElementById('modal-downloads').textContent = app.downloads || 0;

    const changelogDiv = document.getElementById('modal-changelog');
    changelogDiv.innerHTML = (app.changelog || [])
        .map(change => `<p style="margin: 0.5rem 0; color: #64748b;">- ${change}</p>`)
        .join('');

    const downloadBtn = document.getElementById('modal-download-btn');
    downloadBtn.href = app.downloadUrl;
    downloadBtn.download = app.fileName;
    downloadBtn.onclick = function(e) {
        e.preventDefault();
        downloadApp(appId, e);
        closeModal();
    };

    document.getElementById('app-modal').classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('app-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function setupEventListeners() {
    window.onclick = function(event) {
        const modal = document.getElementById('app-modal');
        if (modal && event.target === modal) {
            modal.classList.remove('show');
        }
    };

    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href') || '';
            if (href.startsWith('#')) {
                e.preventDefault();
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                if (href !== '#' && document.querySelector(href)) {
                    document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

function updateStats() {
    const totalDownloads = appsCache.reduce((sum, app) => sum + (app.downloads || 0), 0);
    const totalApps = appsCache.length;
    const now = new Date();
    const lastUpdated = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const totalDownloadsEl = document.getElementById('total-downloads');
    const totalAppsEl = document.getElementById('total-apps');
    const lastUpdatedEl = document.getElementById('last-updated');

    if (totalDownloadsEl) totalDownloadsEl.textContent = totalDownloads;
    if (totalAppsEl) totalAppsEl.textContent = totalApps;
    if (lastUpdatedEl) lastUpdatedEl.textContent = lastUpdated;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background-color: ${type === 'success' ? '#10b981' : '#0e7490'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        z-index: 2000;
        animation: slideDown 0.3s ease;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

window.vitechApi = {
    getApps: async () => {
        const apps = await apiRequest('/apps');
        appsCache = apps;
        return apps;
    },
    addApp: async (appData, token) => {
        const result = await apiRequest('/apps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(appData)
        });
        await loadApps();
        return result;
    },
    editApp: async (appId, updates, token) => {
        const result = await apiRequest(`/apps/${appId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });
        await loadApps();
        return result;
    },
    deleteApp: async (appId, token) => {
        await apiRequest(`/apps/${appId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        await loadApps();
        return true;
    },
    loadApps
};

document.addEventListener('DOMContentLoaded', async function() {
    await loadApps();
    if (hasPublicUI()) {
        setupEventListeners();
        renderApps();
        updateStats();
    }
});

(function () {
    const hasSdk = !!(window.supabase && window.supabase.createClient);
    const enabled = !!(
        window.VITECH_SUPABASE_ENABLED &&
        hasSdk &&
        window.VITECH_SUPABASE_URL &&
        window.VITECH_SUPABASE_ANON_KEY
    );

    if (!enabled) {
        window.vitechCloud = { enabled: false, provider: 'none' };
        return;
    }

    const bucket = window.VITECH_SUPABASE_BUCKET || 'app-downloads';
    const client = window.supabase.createClient(
        window.VITECH_SUPABASE_URL,
        window.VITECH_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    );

    function nowIso() {
        return new Date().toISOString();
    }

    function toHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function randomHex(bytes) {
        const arr = new Uint8Array(bytes);
        window.crypto.getRandomValues(arr);
        return Array.from(arr)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async function hashPassword(salt, password) {
        const text = `${salt}:${password}`;
        const encoded = new TextEncoder().encode(text);
        const digest = await window.crypto.subtle.digest('SHA-256', encoded);
        return toHex(digest);
    }

    function normalizeApp(row) {
        return {
            id: Number(row.id || 0),
            name: row.name || '',
            version: row.version || '',
            description: row.description || '',
            fileName: row.file_name || '',
            downloadUrl: row.download_url || '',
            changelog: Array.isArray(row.changelog) ? row.changelog : [],
            downloads: Number(row.downloads || 0),
            createdAt: row.created_at || null,
            updatedAt: row.updated_at || null
        };
    }

    async function getApps() {
        const { data, error } = await client
            .from('apps')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw new Error(error.message);
        return (data || []).map(normalizeApp);
    }

    async function nextAppId() {
        const { data, error } = await client
            .from('apps')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        if (error) throw new Error(error.message);
        return data && data.length ? Number(data[0].id) + 1 : 1;
    }

    async function addApp(payload) {
        const appId = await nextAppId();
        const row = {
            id: appId,
            name: String(payload.name || '').trim(),
            version: String(payload.version || '').trim(),
            description: String(payload.description || '').trim(),
            file_name: String(payload.fileName || '').trim(),
            download_url: String(payload.downloadUrl || '').trim(),
            changelog: Array.isArray(payload.changelog) ? payload.changelog : ['Initial release'],
            downloads: 0,
            created_at: nowIso(),
            updated_at: nowIso()
        };

        const { error } = await client.from('apps').insert(row);
        if (error) throw new Error(error.message);

        return {
            id: row.id,
            name: row.name,
            version: row.version,
            description: row.description,
            fileName: row.file_name,
            downloadUrl: row.download_url,
            changelog: row.changelog,
            downloads: row.downloads,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    async function editApp(appId, updates) {
        const patch = {
            updated_at: nowIso()
        };

        if (updates.name !== undefined) patch.name = String(updates.name || '').trim();
        if (updates.version !== undefined) patch.version = String(updates.version || '').trim();
        if (updates.description !== undefined) patch.description = String(updates.description || '').trim();
        if (updates.fileName !== undefined) patch.file_name = String(updates.fileName || '').trim();
        if (updates.downloadUrl !== undefined) patch.download_url = String(updates.downloadUrl || '').trim();
        if (updates.changelog !== undefined) patch.changelog = Array.isArray(updates.changelog) ? updates.changelog : ['Initial release'];

        const { error } = await client.from('apps').update(patch).eq('id', Number(appId));
        if (error) throw new Error(error.message);

        const { data, error: fetchError } = await client.from('apps').select('*').eq('id', Number(appId)).single();
        if (fetchError) throw new Error(fetchError.message);
        return normalizeApp(data);
    }

    async function deleteApp(appId) {
        const { error } = await client.from('apps').delete().eq('id', Number(appId));
        if (error) throw new Error(error.message);
        return true;
    }

    async function incrementDownload(appId) {
        const { data, error } = await client.from('apps').select('downloads').eq('id', Number(appId)).single();
        if (error) throw new Error(error.message);
        const current = Number((data || {}).downloads || 0);
        const { error: updateError } = await client
            .from('apps')
            .update({ downloads: current + 1, updated_at: nowIso() })
            .eq('id', Number(appId));
        if (updateError) throw new Error(updateError.message);
    }

    async function uploadFile(file) {
        const safeName = file.name.replace(/\s+/g, '-');
        const objectPath = `${Date.now()}-${safeName}`;
        const { error } = await client.storage.from(bucket).upload(objectPath, file, {
            cacheControl: '3600',
            upsert: false
        });
        if (error) throw new Error(error.message);

        const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
        return {
            fileName: file.name,
            downloadUrl: data.publicUrl
        };
    }

    async function getAdminSetupStatus() {
        const { data, error } = await client
            .from('settings')
            .select('value')
            .eq('key', 'admin_auth')
            .maybeSingle();

        if (error) throw new Error(error.message);
        return {
            isSetup: !!data,
            managedBy: 'supabase'
        };
    }

    async function setupAdminPassword(password, confirmPassword) {
        if (String(password || '').length < 8) {
            throw new Error('Password must be at least 8 characters.');
        }
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match.');
        }

        const status = await getAdminSetupStatus();
        if (status.isSetup) {
            throw new Error('Admin password is already configured.');
        }

        const salt = randomHex(16);
        const hash = await hashPassword(salt, password);

        const { error } = await client.from('settings').insert({
            key: 'admin_auth',
            value: { salt, hash, updatedAt: nowIso() }
        });

        if (error) throw new Error(error.message);
        return true;
    }

    async function loginAdminPassword(password) {
        const { data, error } = await client
            .from('settings')
            .select('value')
            .eq('key', 'admin_auth')
            .single();

        if (error || !data || !data.value) {
            throw new Error('Admin password is not configured yet.');
        }

        const salt = String(data.value.salt || '');
        const hash = String(data.value.hash || '');
        const inputHash = await hashPassword(salt, String(password || ''));
        if (!inputHash || inputHash !== hash) {
            throw new Error('Invalid password. Try again.');
        }

        sessionStorage.setItem('vitech_admin_token', 'supabase-session');
        sessionStorage.setItem('vitech_admin_auth', '1');
        return true;
    }

    window.vitechCloud = {
        enabled: true,
        provider: 'supabase',
        getApps,
        addApp,
        editApp,
        deleteApp,
        incrementDownload,
        uploadFile,
        getAdminSetupStatus,
        setupAdminPassword,
        loginAdminPassword
    };
})();

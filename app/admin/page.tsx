'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface App {
  id: string
  name: string
  version: string
  description: string
  file_name: string
  changelog?: string
  downloads: number
}

export default function Admin() {
  const router = useRouter()
  const [apps, setApps] = useState<App[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    description: '',
    file_name: '',
    changelog: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadApps()
  }, [])

  const loadApps = async () => {
    try {
      const response = await fetch('/api/apps')

      if (response.status === 401) {
        router.push('/admin-access')
        return
      }

      if (response.ok) {
        const data = await response.json()
        setApps(data)
      } else {
        setError('Failed to load apps')
      }
    } catch (error) {
      setError('Failed to load apps')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      version: '',
      description: '',
      file_name: '',
      changelog: '',
    })
    setFile(null)
    setEditingId(null)
  }

  const handleEdit = (app: App) => {
    setEditingId(app.id)
    setFormData({
      name: app.name,
      version: app.version,
      description: app.description,
      file_name: app.file_name,
      changelog: app.changelog || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setUploading(true)

    try {
      let uploadUrl = ''

      // Upload file if selected
      if (file) {
        const formDataFile = new FormData()
        formDataFile.append('file', file)

        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formDataFile,
          })

          if (uploadResponse.status === 401) {
            router.push('/admin-access')
            setUploading(false)
            return
          }

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            uploadUrl = uploadData.url
          } else {
            const uploadData = await uploadResponse.json().catch(() => null)
            setError(uploadData?.error || 'File upload failed')
            setUploading(false)
            return
          }
        } catch (uploadError) {
          setError('File upload error')
          setUploading(false)
          return
        }
      }

      // Add or update app
      const appData = {
        name: formData.name,
        version: formData.version,
        description: formData.description,
        file_name: formData.file_name,
        changelog: formData.changelog,
        ...(uploadUrl && { download_url: uploadUrl }),
      }

      const endpoint = editingId ? `/api/apps/${editingId}` : '/api/apps'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData),
      })

      if (response.status === 401) {
        router.push('/admin-access')
        return
      }

      if (response.ok) {
        setSuccess(
          editingId
            ? 'App updated successfully!'
            : 'App added successfully!'
        )
        resetForm()
        loadApps()
      } else {
        const data = await response.json()
        setError(data.error || 'Operation failed')
      }
    } catch (error) {
      setError('An error occurred')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return

    try {
      const response = await fetch(`/api/apps/${id}`, { method: 'DELETE' })

      if (response.status === 401) {
        router.push('/admin-access')
        return
      }

      if (response.ok) {
        setSuccess('App deleted successfully!')
        loadApps()
      } else {
        const data = await response.json().catch(() => null)
        setError(data?.error || 'Failed to delete app')
      }
    } catch (error) {
      setError('Delete error')
      console.error(error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin-access')
  }

  if (loading) {
    return (
      <div className="container">
        <style>{`
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
          }

          .loading {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            color: #666;
          }
        `}</style>
        <div className="loading">Loading admin panel...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        header {
          background: white;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        header h1 {
          color: #333;
        }

        .logout-btn {
          background: #dc3545;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 600;
        }

        .logout-btn:hover {
          opacity: 0.9;
        }

        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        @media (max-width: 768px) {
          .two-column {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .card h2 {
          color: #333;
          margin-bottom: 20px;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        label {
          color: #333;
          font-weight: 500;
          margin-top: 10px;
        }

        input,
        textarea {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-family: inherit;
          font-size: 1em;
          transition: border-color 0.3s;
        }

        input:focus,
        textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        textarea {
          resize: vertical;
          min-height: 80px;
        }

        button {
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        button:hover {
          opacity: 0.9;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-buttons {
          display: flex;
          gap: 10px;
        }

        .form-buttons button {
          flex: 1;
        }

        .secondary {
          background: #6c757d;
        }

        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 15px;
        }

        .success {
          background: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 15px;
        }

        .apps-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .app-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #667eea;
        }

        .app-item h3 {
          color: #333;
          margin-bottom: 5px;
        }

        .app-item .info {
          color: #666;
          font-size: 0.9em;
          margin-bottom: 10px;
        }

        .app-item .description {
          color: #555;
          margin-bottom: 10px;
          font-size: 0.95em;
        }

        .app-actions {
          display: flex;
          gap: 10px;
        }

        .app-actions button {
          flex: 1;
          padding: 8px;
          font-size: 0.9em;
        }

        .delete-btn {
          background: #dc3545;
        }

        .edit-btn {
          background: #007bff;
        }

        .empty {
          text-align: center;
          color: #666;
          padding: 40px 20px;
        }

        .file-input-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #666;
          font-size: 0.9em;
        }

        .file-name {
          color: #667eea;
          font-weight: 500;
        }
      `}</style>

      <header>
        <h1>Admin Panel</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="two-column">
        {/* Form Section */}
        <div className="card">
          <h2>{editingId ? 'Edit App' : 'Add New App'}</h2>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name">App Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label htmlFor="version">Version *</label>
              <input
                type="text"
                id="version"
                value={formData.version}
                onChange={(e) =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="e.g., 1.0.0"
                required
              />
            </div>

            <div>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label htmlFor="file_name">File Name *</label>
              <input
                type="text"
                id="file_name"
                value={formData.file_name}
                onChange={(e) =>
                  setFormData({ ...formData, file_name: e.target.value })
                }
                placeholder="e.g., app.apk"
                required
              />
            </div>

            <div>
              <label htmlFor="changelog">Changelog</label>
              <textarea
                id="changelog"
                value={formData.changelog}
                onChange={(e) =>
                  setFormData({ ...formData, changelog: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="file">Upload File</label>
              <input
                type="file"
                id="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <div className="file-name">Selected: {file.name}</div>}
            </div>

            <div className="form-buttons">
              <button type="submit" disabled={uploading}>
                {uploading
                  ? 'Uploading...'
                  : editingId
                    ? 'Update App'
                    : 'Add App'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Apps List Section */}
        <div className="card">
          <h2>Applications ({apps.length})</h2>

          {apps.length > 0 ? (
            <div className="apps-list">
              {apps.map((app) => (
                <div key={app.id} className="app-item">
                  <h3>{app.name}</h3>
                  <div className="info">
                    v{app.version} • {app.downloads} downloads
                  </div>
                  <div className="description">{app.description}</div>
                  <div className="app-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(app)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(app.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No apps yet. Create your first one!</div>
          )}
        </div>
      </div>
    </div>
  )
}

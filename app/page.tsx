'use client'

import { useEffect, useState } from 'react'

interface App {
  id: string
  name: string
  version: string
  description: string
  file_name: string
  download_url: string
  downloads: number
}

export default function Home() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadApps = async () => {
      try {
        const response = await fetch('/api/apps')
        if (response.ok) {
          const data = await response.json()
          setApps(data)
        }
      } catch (error) {
        console.error('Failed to load apps:', error)
      } finally {
        setLoading(false)
      }
    }

    loadApps()
  }, [])

  const handleDownload = (app: App) => {
    window.location.assign(`/api/apps/${app.id}/download`)
  }

  return (
    <div className="app-container">
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

        .app-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        header {
          text-align: center;
          color: white;
          margin-bottom: 40px;
          padding: 40px 20px 20px;
        }

        header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
        }

        header p {
          font-size: 1.1em;
          opacity: 0.9;
        }

        .nav-links {
          text-align: center;
          margin-bottom: 30px;
        }

        .nav-links a {
          color: white;
          text-decoration: none;
          margin: 0 15px;
          font-weight: 500;
          transition: opacity 0.3s;
        }

        .nav-links a:hover {
          opacity: 0.7;
        }

        .apps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .app-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .app-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .app-card h3 {
          color: #333;
          margin-bottom: 5px;
        }

        .app-card .version {
          color: #666;
          font-size: 0.9em;
          margin-bottom: 10px;
        }

        .app-card p {
          color: #555;
          line-height: 1.5;
          margin-bottom: 15px;
          min-height: 60px;
        }

        .app-card .downloads {
          color: #999;
          font-size: 0.85em;
          margin-bottom: 15px;
        }

        .download-btn {
          width: 100%;
          padding: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1em;
          font-weight: 600;
          transition: opacity 0.3s;
        }

        .download-btn:hover {
          opacity: 0.9;
        }

        .download-btn:active {
          transform: scale(0.98);
        }

        .loading {
          text-align: center;
          color: white;
          font-size: 1.2em;
          padding: 40px;
        }

        .empty {
          text-align: center;
          color: white;
          padding: 40px;
          font-size: 1.1em;
        }
      `}</style>

      <header>
        <h1>Vitech SAS Downloader</h1>
        <p>Download applications and tools</p>
      </header>

      <div className="nav-links">
        <a href="/">Home</a>
        <a href="/admin-access">Admin</a>
      </div>

      {loading ? (
        <div className="loading">Loading applications...</div>
      ) : apps.length > 0 ? (
        <div className="apps-grid">
          {apps.map((app) => (
            <div key={app.id} className="app-card">
              <h3>{app.name}</h3>
              <div className="version">v{app.version}</div>
              <p>{app.description}</p>
              <div className="downloads">
                {app.downloads} {app.downloads === 1 ? 'download' : 'downloads'}
              </div>
              <button
                className="download-btn"
                onClick={() => handleDownload(app)}
              >
                Download ({app.file_name})
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No applications available</div>
      )}
    </div>
  )
}

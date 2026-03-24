'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAccess() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin/status')
        const data = await response.json()
        setIsSetupMode(!data.passwordSet)
      } catch (error) {
        console.error('Failed to check admin status:', error)
        setIsSetupMode(true)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (isSetupMode && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      const endpoint = isSetupMode ? '/api/admin/setup' : '/api/admin/login'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        setMessage(
          isSetupMode
            ? 'Password set successfully! Redirecting...'
            : 'Login successful! Redirecting...'
        )
        setTimeout(() => {
          router.push('/admin')
        }, 1500)
      } else {
        const data = await response.json()
        setError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      console.error(error)
    }
  }

  if (loading) {
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
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .container {
            width: 100%;
            max-width: 400px;
          }

          .card {
            background: white;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          }

          h1 {
            color: #333;
            margin-bottom: 10px;
            text-align: center;
          }

          .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
            font-size: 0.9em;
          }

          form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          label {
            display: block;
            color: #333;
            font-weight: 500;
            margin-bottom: 5px;
          }

          input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1em;
            transition: border-color 0.3s;
          }

          input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          button {
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.3s;
          }

          button:hover {
            opacity: 0.9;
          }

          button:active {
            transform: scale(0.98);
          }

          .error {
            background: #f8d7da;
            color: #721c24;
            padding: 12px;
            border-radius: 5px;
            text-align: center;
          }

          .message {
            background: #d4edda;
            color: #155724;
            padding: 12px;
            border-radius: 5px;
            text-align: center;
          }

          .nav-link {
            text-align: center;
            margin-top: 20px;
          }

          .nav-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
          }

          .nav-link a:hover {
            text-decoration: underline;
          }

          .loading {
            text-align: center;
            color: #666;
          }
        `}</style>
        <div className="card">
          <div className="loading">Loading...</div>
        </div>
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
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .container {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .card {
          background: white;
          border-radius: 10px;
          padding: 40px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        h1 {
          color: #333;
          margin-bottom: 10px;
          text-align: center;
        }

        .subtitle {
          color: #666;
          text-align: center;
          margin-bottom: 30px;
          font-size: 0.9em;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        label {
          display: block;
          color: #333;
          font-weight: 500;
          margin-bottom: 5px;
        }

        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 1em;
          transition: border-color 0.3s;
        }

        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        button {
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        button:hover {
          opacity: 0.9;
        }

        button:active {
          transform: scale(0.98);
        }

        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 5px;
          text-align: center;
        }

        .message {
          background: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 5px;
          text-align: center;
        }

        .nav-link {
          text-align: center;
          margin-top: 20px;
        }

        .nav-link a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .nav-link a:hover {
          text-decoration: underline;
        }
      `}</style>
      <div className="card">
        <h1>{isSetupMode ? 'Setup Admin Password' : 'Admin Login'}</h1>
        <p className="subtitle">
          {isSetupMode
            ? 'Create your admin password'
            : 'Enter your admin password'}
        </p>

        {error && <div className="error">{error}</div>}
        {message && <div className="message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {isSetupMode && (
            <div>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
              />
            </div>
          )}

          <button type="submit">
            {isSetupMode ? 'Set Password' : 'Login'}
          </button>
        </form>

        <div className="nav-link">
          <a href="/">← Back to Home</a>
        </div>
      </div>
    </div>
  )
}

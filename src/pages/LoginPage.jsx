import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#141820', border: '1px solid #2d3748',
        borderRadius: 12, padding: 32, width: 340,
      }}>
        <h1 style={{ color: '#63b3ed', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          📡 Control de Avances FTTH
        </h1>
        <p style={{ color: '#718096', fontSize: 12, marginBottom: 24 }}>
          Inicia sesión para continuar
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#a0aec0', fontSize: 11, display: 'block', marginBottom: 4 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', background: '#0f1117', border: '1px solid #2d3748',
                borderRadius: 6, color: '#e2e8f0', fontSize: 13, padding: '8px 10px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#a0aec0', fontSize: 11, display: 'block', marginBottom: 4 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', background: '#0f1117', border: '1px solid #2d3748',
                borderRadius: 6, color: '#e2e8f0', fontSize: 13, padding: '8px 10px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#2d1515', border: '1px solid #742a2a',
              borderRadius: 6, padding: '8px 10px', color: '#fc8181',
              fontSize: 12, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? '#2d3748' : '#2b6cb0',
              border: 'none', borderRadius: 6, color: '#fff',
              fontSize: 13, fontWeight: 700, padding: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

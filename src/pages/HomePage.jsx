import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getPlans, deletePlan, createPlan } from '../lib/api'
import { parseDxf } from '../lib/dxfParser'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    try {
      const data = await getPlans()
      setPlans(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(file) {
    if (!file || !file.name.match(/\.dxf$/i)) return
    setUploadStatus('Procesando ' + file.name + '...')
    setUploadError('')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const result = parseDxf(ev.target.result)
      if (result.err) { setUploadError(result.err); setUploadStatus(''); return }
      try {
        const plan = await createPlan({
          name: result.name, street: result.street,
          odnLat: result.odnLat, odnLon: result.odnLon,
          mTotal: result.mTotal, napTotal: result.naps.length,
          segTotal: result.segs.length,
          naps: result.naps, segs: result.segs,
        })
        setUploadStatus('Plano ' + result.name + ' cargado.')
        setPlans(prev => [plan, ...prev])
        setTimeout(() => { setUploadStatus(''); navigate('/visor/' + plan._id) }, 1200)
      } catch (err) {
        setUploadError(err.message)
        setUploadStatus('')
      }
    }
    reader.readAsText(file, 'latin1')
  }

  async function handleDelete(e, id, name) {
    e.stopPropagation()
    if (!confirm('¿Eliminar ' + name + '?')) return
    await deletePlan(id)
    setPlans(prev => prev.filter(p => p._id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: '"Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0f1117', borderBottom: '1px solid #2d3748', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#63b3ed', letterSpacing: 1 }}>📡 Control de Avances FTTH</h1>
          <p style={{ fontSize: 10, color: '#718096', marginTop: 2 }}>Planos de distribución de fibra óptica</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#718096' }}>👤 {user?.name}</span>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #2d3748', borderRadius: 5, color: '#a0aec0', cursor: 'pointer', fontSize: 11, padding: '4px 10px' }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        {/* Upload zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => document.getElementById('dxf-input').click()}
          style={{ border: '2px dashed #2d3748', borderRadius: 10, padding: 28, textAlign: 'center', cursor: 'pointer', background: '#141820', marginBottom: 24 }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#63b3ed' }}>Cargar nuevo plano DXF</div>
          <div style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>Clic aquí o arrastra el archivo .DXF</div>
          <input id="dxf-input" type="file" accept=".dxf" style={{ display: 'none' }}
            onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
          {uploadStatus && <div style={{ fontSize: 11, color: '#68d391', marginTop: 10 }}>{uploadStatus}</div>}
          {uploadError && <div style={{ fontSize: 11, color: '#fc8181', marginTop: 10 }}>{uploadError}</div>}
        </div>

        {/* Plans grid */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#a0aec0', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Planos registrados</h2>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#4a5568', padding: 40 }}>Cargando...</div>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4a5568', padding: 40 }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <p style={{ fontSize: 13 }}>Aún no hay planos.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {plans.map(p => {
              const pn = p.napTotal ? Math.round(p.napDone / p.napTotal * 100) : 0
              const pf = p.mTotal   ? Math.round(p.mDone   / p.mTotal   * 100) : 0
              const mR = (p.mTotal || 0) - (p.mDone || 0)
              const dt = p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
              return (
                <div key={p._id} onClick={() => navigate('/visor/' + p._id)}
                  style={{ background: '#141820', border: '1px solid #2d3748', borderRadius: 10, padding: 14, cursor: 'pointer', position: 'relative' }}>
                  <button onClick={e => handleDelete(e, p._id, p.name)}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 14 }}>
                    🗑
                  </button>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#718096', marginBottom: 10 }}>
                    {p.street}{p.street ? ' · ' : ''}{Math.round(p.mTotal || 0)} m diseño
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#68d391' }}>{p.napDone || 0}/{p.napTotal || 0}</div>
                      <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#718096' }}>NAPs inst.</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#63b3ed' }}>{p.segDone || 0}/{p.segTotal || 0}</div>
                      <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#718096' }}>Tramos</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fc8181' }}>{Math.round(mR)} m</div>
                      <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#718096' }}>Pendientes</div>
                    </div>
                  </div>
                  <div style={{ height: 4, background: '#2d3748', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: pn + '%', background: 'linear-gradient(90deg,#276749,#68d391)', borderRadius: 2 }} />
                  </div>
                  <div style={{ height: 4, background: '#2d3748', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: pf + '%', background: 'linear-gradient(90deg,#2b6cb0,#63b3ed)', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#4a5568' }}>Cargado: {dt}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

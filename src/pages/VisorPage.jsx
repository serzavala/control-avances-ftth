import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getPlan, getProgress, patchProgress, resetProgress } from '../lib/api'
import { FIBER_COLORS } from '../lib/dxfParser'
import 'leaflet/dist/leaflet.css'

function napIcon(id, type, done) {
  const col  = done ? '#68d391' : '#4a5568'
  const bg   = done ? '#0a2018' : '#101418'
  const r    = type === 'NAP-F' ? '3px' : '50%'
  const glow = done ? 'box-shadow:0 0 7px #68d39188;' : ''
  const num  = id.replace('NAP', '')
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:${r};border:2px solid ${col};background:${bg};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:${col};${glow}">${num}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 0.5 }) }, [center])
  return null
}

export default function VisorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan]           = useState(null)
  const [progress, setProgress]   = useState({ naps: {}, segs: {} })
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [activeTab, setActiveTab] = useState('n')
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')
  const [flyTo, setFlyTo]         = useState(null)
  const sidebarRef = useRef(null)

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    try {
      const [planData, progData] = await Promise.all([getPlan(id), getProgress(id)])
      setPlan(planData)
      setProgress(progData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const naps = plan ? JSON.parse(plan.naps || '[]') : []
  const segs = plan ? JSON.parse(plan.segs || '[]') : []

  const napDone = naps.filter(n => progress.naps[n.id] === true).length
  const segDone = segs.filter(s => progress.segs[s.id] === true).length
  const mDone   = segs.filter(s => progress.segs[s.id] === true).reduce((a, s) => a + s.length, 0)
  const mPend   = (plan?.mTotal || 0) - mDone
  const pn      = naps.length ? Math.round(napDone / naps.length * 100) : 0
  const pf      = plan?.mTotal ? Math.round(mDone / plan.mTotal * 100) : 0

  async function toggle(type, itemId) {
    const current = type === 'n' ? progress.naps[itemId] : progress.segs[itemId]
    const newVal  = !current
    setProgress(prev => ({
      ...prev,
      [type === 'n' ? 'naps' : 'segs']: {
        ...prev[type === 'n' ? 'naps' : 'segs'],
        [itemId]: newVal
      }
    }))
    try {
      await patchProgress(id, type === 'n' ? 'nap' : 'seg', itemId, newVal)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleReset() {
    if (!confirm('¿Borrar TODO el avance?')) return
    await resetProgress(id)
    setProgress({ naps: {}, segs: {} })
    setSelected(null)
  }

  function selectItem(type, itemId) {
    setSelected({ type, id: itemId })
    const card = document.getElementById('card-' + itemId)
    if (card) card.scrollIntoView({ block: 'nearest' })
    if (type === 'n') {
      const n = naps.find(x => x.id === itemId)
      if (n) setFlyTo({ center: [n.lat, n.lon], zoom: 19 })
      setActiveTab('n')
    } else {
      const s = segs.find(x => x.id === itemId)
      if (s) {
        const lats = s.coords.map(c => c[0])
        const lons = s.coords.map(c => c[1])
        setFlyTo({
          center: [
            (Math.min(...lats) + Math.max(...lats)) / 2,
            (Math.min(...lons) + Math.max(...lons)) / 2,
          ],
          zoom: 19,
        })
      }
      setActiveTab('f')
    }
  }

  function applyReport() {
    const lines = reportText.split('\n').map(l => l.trim().toUpperCase()).filter(Boolean)
    let ok = 0
    lines.forEach(line => {
      const m = line.match(/(ODN|NAP\s*0*(\d+))\s+AL\s+(ODN|NAP\s*0*(\d+))/)
      if (!m) return
      const nr = s => s.replace(/\s+/g, '').replace(/NAP0*(\d+)/, 'NAP$1')
      const fr = nr(m[1]), to = nr(m[3])
      const seg = segs.find(s => {
        const sf = s.from.toUpperCase(), st = s.to.toUpperCase()
        return (sf === fr && st === to) || (sf === to && st === fr)
      })
      if (seg) { toggle('s', seg.id); ok++ }
    })
    setShowReport(false)
    setReportText('')
    alert(ok > 0 ? ok + ' tramos marcados.' : 'No se reconoció ningún tramo.')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#63b3ed', fontSize: 14 }}>
      Cargando plano...
    </div>
  )

  if (!plan) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fc8181', fontSize: 14 }}>
      Plano no encontrado.
      <button onClick={() => navigate('/')} style={{ marginLeft: 10, color: '#63b3ed', background: 'none', border: 'none', cursor: 'pointer' }}>
        Volver
      </button>
    </div>
  )

  const selItem = selected
    ? selected.type === 'n'
      ? naps.find(x => x.id === selected.id)
      : segs.find(x => x.id === selected.id)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: '"Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0f1117', borderBottom: '1px solid #2d3748', padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #2d3748', borderRadius: 5, color: '#a0aec0', cursor: 'pointer', fontSize: 11, padding: '4px 9px' }}>
            ← Planos
          </button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#63b3ed' }}>{plan.name}</div>
            <div style={{ fontSize: 10, color: '#718096' }}>{plan.street}{plan.street ? ' · ' : ''}{Math.round(plan.mTotal || 0)} m diseño</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#68d391' }}>{napDone}/{naps.length}</div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#718096' }}>NAPs inst.</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#63b3ed' }}>{segDone}/{segs.length}</div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#718096' }}>Tramos</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fc8181' }}>{Math.round(mPend)} m</div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#718096' }}>Pendientes</div>
          </div>
          <div style={{ width: 120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#718096' }}>
              <span>NAPs</span><span>{pn}%</span>
            </div>
            <div style={{ height: 4, background: '#2d3748', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{ height: '100%', width: pn + '%', background: 'linear-gradient(90deg,#276749,#68d391)', borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#718096' }}>
              <span>Fibra</span><span>{pf}%</span>
            </div>
            <div style={{ height: 4, background: '#2d3748', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pf + '%', background: 'linear-gradient(90deg,#2b6cb0,#63b3ed)', borderRadius: 2 }} />
            </div>
          </div>
          <button onClick={() => setShowReport(true)} style={{ padding: '5px 9px', border: 'none', borderRadius: 5, background: '#2b6cb0', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            📋 Reporte
          </button>
          <button onClick={handleReset} style={{ padding: '5px 9px', border: 'none', borderRadius: 5, background: '#4a1515', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            🗑 Reset
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 215, background: '#141820', borderRight: '1px solid #2d3748', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #2d3748' }}>
            {[['n', 'NAPs (' + naps.length + ')'], ['f', 'Fibra (' + segs.length + ')']].map(([t, label]) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: 7, fontSize: 10, fontWeight: 700, textAlign: 'center', cursor: 'pointer', border: 'none', background: 'transparent', color: activeTab === t ? '#63b3ed' : '#718096', borderBottom: activeTab === t ? '2px solid #63b3ed' : '2px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>
          <div ref={sidebarRef} style={{ flex: 1, overflowY: 'auto', padding: 5 }}>
            {activeTab === 'n' && naps.map(n => {
              const done = progress.naps[n.id] === true
              const isSel = selected?.id === n.id
              const col = done ? '#68d391' : '#4a5568'
              return (
                <div key={n.id} id={'card-' + n.id} onClick={() => selectItem('n', n.id)}
                  style={{ border: '1px solid ' + (isSel ? '#f6ad55' : done ? '#276749' : '#2d3748'), borderRadius: 5, padding: '6px 8px', marginBottom: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: isSel ? '#1f1a08' : done ? '#0d1f14' : '#1a2035' }}>
                  <div style={{ width: 20, height: 20, borderRadius: n.type === 'NAP-F' ? '3px' : '50%', border: '2px solid ' + col, background: done ? '#0a2018' : '#101418', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: col, flexShrink: 0 }}>
                    {n.id.replace('NAP', '')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>{n.id} {n.type}</div>
                    <div style={{ fontSize: 9, color: col }}>{done ? 'Instalada' : 'Pendiente'}</div>
                  </div>
                </div>
              )
            })}
            {activeTab === 'f' && segs.map(s => {
              const done = progress.segs[s.id] === true
              const isSel = selected?.id === s.id
              const col = done ? (FIBER_COLORS[s.layer] || '#63b3ed') : '#4a5568'
              return (
                <div key={s.id} id={'card-' + s.id} onClick={() => selectItem('s', s.id)}
                  style={{ border: '1px solid ' + (isSel ? '#f6ad55' : done ? '#276749' : '#2d3748'), borderRadius: 5, padding: '6px 8px', marginBottom: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: isSel ? '#1f1a08' : done ? '#0d1f14' : '#1a2035' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>{s.from} → {s.to}</div>
                    <div style={{ fontSize: 9, color: '#718096' }}>{s.layer}</div>
                    <div style={{ fontSize: 9, color: col }}>{done ? 'Tendido: ' : ''}{s.length} m</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={[plan.odnLat, plan.odnLon]} zoom={17} style={{ width: '100%', height: '100%' }} zoomControl={true} attributionControl={false}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={20} />
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={20} opacity={0.55} />
            {flyTo && <FlyTo center={flyTo.center} zoom={flyTo.zoom} />}

            {/* ODN */}
            <Marker position={[plan.odnLat, plan.odnLon]} icon={L.divIcon({ className: '', html: '<div style="font-size:22px;line-height:1;text-shadow:0 0 8px #f6ad55">⭐</div>', iconSize: [22, 22], iconAnchor: [11, 11] })}>
              <Tooltip direction="top">{plan.name}</Tooltip>
            </Marker>

            {/* Segmentos */}
            {segs.map(s => {
              const done = progress.segs[s.id] === true
              const isSel = selected?.id === s.id
              return (
                <Polyline key={s.id} positions={s.coords}
                  pathOptions={{ color: done ? (FIBER_COLORS[s.layer] || '#63b3ed') : '#374151', weight: isSel ? 7 : done ? 5 : 2, opacity: done ? 0.95 : 0.65, dashArray: done ? null : '8 5' }}
                  eventHandlers={{ click: () => selectItem('s', s.id) }}
                />
              )
            })}

            {/* NAPs */}
            {naps.map(n => {
              const done = progress.naps[n.id] === true
              return (
                <Marker key={n.id} position={[n.lat, n.lon]} icon={napIcon(n.id, n.type, done)}
                  eventHandlers={{ click: () => selectItem('n', n.id) }}>
                  <Tooltip direction="top">{n.id}</Tooltip>
                </Marker>
              )
            })}
          </MapContainer>

          {/* Panel detalle */}
          {selected && selItem && (
            <div style={{ position: 'absolute', top: 10, left: 225, zIndex: 1000, background: 'rgba(10,12,18,.97)', border: '1px solid #2d3748', borderRadius: 8, padding: '12px 14px', minWidth: 205 }}>
              <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 7, right: 9, background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: 15 }}>✕</button>
              {selected.type === 'n' ? (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>{selItem.id}</h3>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 10, marginBottom: 7, background: '#68d39122', border: '1px solid #68d39166', color: '#68d391' }}>{selItem.type}</span>
                  <p style={{ fontSize: 11, color: '#a0aec0', marginBottom: 2 }}>{progress.naps[selItem.id] ? 'INSTALADA' : 'PENDIENTE'}</p>
                  <p style={{ fontSize: 11, color: '#a0aec0', marginBottom: 8 }}>{selItem.lat}, {selItem.lon}</p>
                  <button onClick={() => toggle('n', selItem.id)} style={{ width: '100%', padding: 7, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: progress.naps[selItem.id] ? '#4a2010' : '#2b6cb0', color: '#fff' }}>
                    {progress.naps[selItem.id] ? 'Quitar instalación' : 'Marcar como instalada'}
                  </button>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>{selItem.from} → {selItem.to}</h3>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 10, marginBottom: 7, background: (FIBER_COLORS[selItem.layer] || '#63b3ed') + '22', border: '1px solid ' + (FIBER_COLORS[selItem.layer] || '#63b3ed') + '66', color: FIBER_COLORS[selItem.layer] || '#63b3ed' }}>{selItem.layer}</span>
                  <p style={{ fontSize: 11, color: '#a0aec0', marginBottom: 8 }}>{selItem.length} m · {progress.segs[selItem.id] ? 'TENDIDO' : 'PENDIENTE'}</p>
                  <button onClick={() => toggle('s', selItem.id)} style={{ width: '100%', padding: 7, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: progress.segs[selItem.id] ? '#742a2a' : '#276749', color: '#fff' }}>
                    {progress.segs[selItem.id] ? 'Quitar tendido' : 'Marcar como tendido'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Leyenda */}
          <div style={{ position: 'absolute', bottom: 14, right: 10, zIndex: 1000, background: 'rgba(10,12,18,.93)', border: '1px solid #2d3748', borderRadius: 8, padding: '8px 11px', fontSize: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: 1, color: '#718096', marginBottom: 4, textTransform: 'uppercase' }}>Fibra 1 Hilo</div>
            {Object.entries(FIBER_COLORS).map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 18, height: 3, borderRadius: 2, background: color }} />
                <span>{label.replace('FIBRA 1H', '')}</span>
              </div>
            ))}
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #2d3748' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid #68d391', background: '#0a2018' }} />
                <span>NAP-L inst.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, border: '2px solid #68d391', background: '#0a2018' }} />
                <span>NAP-F inst.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid #4a5568', background: '#1a2035' }} />
                <span>Pendiente</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal reporte */}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a2035', border: '1px solid #2d3748', borderRadius: 10, padding: 16, width: 380, maxWidth: '94vw' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#63b3ed', marginBottom: 8 }}>📋 Reporte de campo</h3>
            <p style={{ fontSize: 11, color: '#a0aec0', marginBottom: 10 }}>Solo marca fibra tendida. Las NAPs se marcan manualmente.</p>
            <textarea value={reportText} onChange={e => setReportText(e.target.value)}
              placeholder={'ODN al nap21\nNap21 al nap22\nNap22 al nap23'}
              style={{ width: '100%', height: 155, background: '#0f1117', border: '1px solid #2d3748', borderRadius: 6, color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', padding: 8, resize: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={applyReport} style={{ flex: 1, padding: 7, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#276749', color: '#fff' }}>✓ Aplicar</button>
              <button onClick={() => { setShowReport(false); setReportText('') }} style={{ flex: 1, padding: 7, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#2d3748', color: '#a0aec0' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

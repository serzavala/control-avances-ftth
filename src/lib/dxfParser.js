const FIBER_LAYERS = {
  'FIBRA 1H(50m)':  '#ef4444',
  'FIBRA 1H(100m)': '#f97316',
  'FIBRA 1H(150m)': '#eab308',
  'FIBRA 1H(200m)': '#22c55e',
  'FIBRA 1H(300m)': '#a855f7',
}

function dist(a, b) {
  return Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2)
}

function polylineLength(pts) {
  let t = 0
  for (let i = 0; i < pts.length - 1; i++) t += dist(pts[i], pts[i+1])
  return t
}

function utm2latlon(e, n) {
  const k0=0.9996, ev=0.00669438, e2=ev*ev, e3=e2*ev
  const ep2=ev/(1-ev), a=6378137
  const x=e-500000, y=n
  const m=y/k0
  const mu=m/(a*(1-ev/4-3*e2/64-5*e3/256))
  const pr=(3*ev/2-27*e3/32)*Math.sin(2*mu)+(21*e2/16)*Math.sin(4*mu)+(151*e3/96)*Math.sin(6*mu)
  const p1=mu+pr, ps=Math.sin(p1), pc=Math.cos(p1), pt=ps/pc
  const pt2=pt*pt, ps2=ps*ps
  const N1=a/Math.sqrt(1-ev*ps2), R1=a*(1-ev)/Math.pow(1-ev*ps2,1.5)
  const D=x/(N1*k0), D2=D*D, D3=D2*D, D4=D3*D, D5=D4*D
  const lat=p1-(N1*pt/R1)*(D2/2-D4/24*(5+3*pt2+10*ep2))
  const lon=(-99*Math.PI/180)+(D-D3/6*(1+2*pt2+ep2)+D5/120*(5+28*pt2))/pc
  return [
    parseFloat((lat*180/Math.PI).toFixed(6)),
    parseFloat((lon*180/Math.PI).toFixed(6)),
  ]
}

function parseLines(text) {
  return text.split('\n').map(l => l.trim())
}

function extractPolylines(lines) {
  const segs = []
  let i = 0
  while (i < lines.length - 1) {
    if (lines[i] === '0' && lines[i+1] === 'LWPOLYLINE') {
      let lyr = '', verts = [], j = i + 2
      while (j < lines.length - 1) {
        const c = lines[j], v = lines[j+1]
        if (c === '0') break
        if (c === '8') lyr = v
        else if (c === '10') {
          const xv = parseFloat(v)
          if (j+2 < lines.length && lines[j+2] === '20') {
            verts.push([xv, parseFloat(lines[j+3])])
            j += 2
          }
        }
        j += 2
      }
      if (FIBER_LAYERS[lyr] && verts.length >= 2) {
        segs.push({ lyr, len: parseFloat(polylineLength(verts).toFixed(2)), verts, s: verts[0], e: verts[verts.length-1] })
      }
      i = j
    } else {
      i += 2
    }
  }
  return segs
}

function extractInserts(lines) {
  const napMap = {}
  let odnP = null, odnName = 'ODN', odnSt = ''
  let i = 0
  while (i < lines.length - 1) {
    if (lines[i] === '0' && lines[i+1] === 'INSERT') {
      let lyr='', blk='', xi=null, yi=null, attrs=[], j=i+2
      while (j < lines.length - 1) {
        const ci=lines[j], vi=lines[j+1]
        if (ci==='0' && vi!=='ATTRIB' && vi!=='SEQEND') break
        if (ci==='0' && vi==='ATTRIB') {
          let ak=j+2, at='', av=''
          while (ak < lines.length-1) {
            if (lines[ak]==='0') break
            if (lines[ak]==='2') at=lines[ak+1]
            if (lines[ak]==='1') av=lines[ak+1]
            ak+=2
          }
          attrs.push({t:at, v:av})
          j=ak; continue
        }
        if (ci==='8') lyr=vi
        else if (ci==='2') blk=vi
        else if (ci==='10') xi=parseFloat(vi)
        else if (ci==='20') yi=parseFloat(vi)
        j+=2
      }
      if (xi !== null && yi !== null) {
        const nom = (attrs.find(a=>a.t==='NOMBRE')||{v:''}).v
        if (blk==='CP' || lyr==='IZZI_ODN_A' || lyr==='IZZI_ODN-A') {
          odnP=[xi,yi]; odnName=nom||'ODN'
          const c1=(attrs.find(a=>a.t==='CALLE1')||{v:''}).v
          const c2=(attrs.find(a=>a.t==='CALLE2')||{v:''}).v
          odnSt=c1+(c2?' esq. '+c2:'')
        } else if ((blk==='CL'||blk==='CF') && nom && nom.indexOf('NAP')>=0) {
          const nid=nom.replace(/.*NAP0*(\d+)$/, 'NAP$1')
          napMap[nid]={ tp: blk==='CF'?'NAP-F':'NAP-L', utm:[xi,yi] }
        }
      }
      i=j
    } else {
      i+=2
    }
  }
  return { napMap, odnP, odnName, odnSt }
}

export function parseDxf(text) {
  const lines = parseLines(text)
  const fsegs = extractPolylines(lines)
  const { napMap, odnP, odnName, odnSt } = extractInserts(lines)

  if (!odnP)              return { err: 'No se encontró la ODN.' }
  if (!Object.keys(napMap).length) return { err: 'No se encontraron NAPs.' }
  if (!fsegs.length)      return { err: 'No se encontraron tramos de fibra.' }

  const odnLL = utm2latlon(odnP[0], odnP[1])
  const THR = 25

  function closest(pt) {
    let best='?', bd=THR
    const dO = dist(pt, odnP)
    if (dO < bd) { best='ODN'; bd=dO }
    for (const nid in napMap) {
      const dv = dist(pt, napMap[nid].utm)
      if (dv < bd) { best=nid; bd=dv }
    }
    return best
  }

  const naps = Object.keys(napMap)
    .sort((a,b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(id => {
      const ll = utm2latlon(napMap[id].utm[0], napMap[id].utm[1])
      return { id, lat: ll[0], lon: ll[1], type: napMap[id].tp }
    })

  const segs = fsegs.map((s, i) => ({
    id: 'S' + String(i+1).padStart(2,'0'),
    layer: s.lyr,
    color: FIBER_LAYERS[s.lyr],
    length: s.len,
    from: closest(s.s),
    to:   closest(s.e),
    coords: s.verts.map(v => utm2latlon(v[0], v[1])),
  }))

  return {
    name:    odnName,
    street:  odnSt,
    odnLat:  odnLL[0],
    odnLon:  odnLL[1],
    naps,
    segs,
    mTotal:  parseFloat(segs.reduce((a,s) => a+s.length, 0).toFixed(2)),
  }
}

export const FIBER_COLORS = FIBER_LAYERS

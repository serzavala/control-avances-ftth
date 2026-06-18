import { connectDB } from '../../src/lib/db.js'
import { Plan } from '../../src/lib/models.js'
import { requireAuth } from '../../src/lib/auth.js'

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'No autorizado' })

  await connectDB()

  // GET - listar todos los planos
  if (req.method === 'GET') {
    const plans = await Plan.find().sort({ createdAt: -1 }).select('-naps -segs')
    return res.status(200).json(plans)
  }

  // POST - crear nuevo plano
  if (req.method === 'POST') {
    const { name, street, odnLat, odnLon, mTotal, napTotal, segTotal, naps, segs } = req.body

    if (!name || !odnLat || !odnLon)
      return res.status(400).json({ error: 'Datos incompletos' })

    const plan = await Plan.create({
      name, street, odnLat, odnLon,
      mTotal, napTotal, segTotal,
      naps: JSON.stringify(naps),
      segs: JSON.stringify(segs),
      createdBy: user.id,
    })

    return res.status(201).json(plan)
  }

  return res.status(405).end()
}

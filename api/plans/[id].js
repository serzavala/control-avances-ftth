import { connectDB } from '../../src/lib/db.js'
import { Plan, Progress } from '../../src/lib/models.js'
import { requireAuth } from '../../src/lib/auth.js'

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'No autorizado' })

  await connectDB()

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
if (req.method === 'OPTIONS') return res.status(200).end()

  const { id } = req.query

  if (req.method === 'GET') {
    const plan = await Plan.findById(id)
    if (!plan) return res.status(404).json({ error: 'Plano no encontrado' })
    return res.status(200).json(plan)
  }

  if (req.method === 'PATCH') {
    const plan = await Plan.findByIdAndUpdate(id, req.body, { new: true })
    if (!plan) return res.status(404).json({ error: 'Plano no encontrado' })
    return res.status(200).json(plan)
  }

  if (req.method === 'DELETE') {
    await Plan.findByIdAndDelete(id)
    await Progress.findOneAndDelete({ planId: id })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}

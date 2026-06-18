import { connectDB } from '../../src/lib/db.js'
import { Progress, Plan } from '../../src/lib/models.js'
import { requireAuth } from '../../src/lib/auth.js'

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'No autorizado' })

  await connectDB()

  const { id } = req.query

  if (req.method === 'GET') {
    const progress = await Progress.findOne({ planId: id })
    if (!progress) return res.status(200).json({ naps: {}, segs: {} })
    return res.status(200).json({
      naps: Object.fromEntries(progress.naps),
      segs: Object.fromEntries(progress.segs),
    })
  }

  if (req.method === 'PATCH') {
    const { type, itemId, value } = req.body

    if (!type || !itemId || value === undefined)
      return res.status(400).json({ error: 'Datos incompletos' })

    let progress = await Progress.findOne({ planId: id })
    if (!progress) {
      progress = await Progress.create({ planId: id, naps: {}, segs: {}, updatedBy: user.id })
    }

    if (type === 'nap') {
      progress.naps.set(itemId, value)
    } else {
      progress.segs.set(itemId, value)
    }
    progress.updatedBy = user.id
    await progress.save()

    const plan = await Plan.findById(id)
    if (plan) {
      const naps = JSON.parse(plan.naps || '[]')
      const segs = JSON.parse(plan.segs || '[]')
      const napDone = naps.filter(n => progress.naps.get(n.id) === true).length
      const segDone = segs.filter(s => progress.segs.get(s.id) === true).length
      const mDone = segs
        .filter(s => progress.segs.get(s.id) === true)
        .reduce((a, s) => a + s.length, 0)
      await Plan.findByIdAndUpdate(id, {
        napDone,
        segDone,
        mDone: parseFloat(mDone.toFixed(2)),
      })
    }

    return res.status(200).json({
      naps: Object.fromEntries(progress.naps),
      segs: Object.fromEntries(progress.segs),
    })
  }

  if (req.method === 'DELETE') {
    await Progress.findOneAndDelete({ planId: id })
    await Plan.findByIdAndUpdate(id, { napDone: 0, segDone: 0, mDone: 0 })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}

import { connectDB } from '../../src/lib/db.js'
import { User } from '../../src/lib/models.js'
import { signToken } from '../../src/lib/auth.js'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_REGISTER)
    return res.status(403).json({ error: 'Registro deshabilitado' })

  await connectDB()

  const { email, password, name } = req.body

  if (!email || !password || !name)
    return res.status(400).json({ error: 'Todos los campos son requeridos' })

  const exists = await User.findOne({ email: email.toLowerCase() })
  if (exists) return res.status(409).json({ error: 'Email ya registrado' })

  const hash = await bcrypt.hash(password, 10)
  const user = await User.create({ email: email.toLowerCase(), password: hash, name })

  const token = signToken({ id: user._id, name: user.name, email: user.email })

  return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } })
}

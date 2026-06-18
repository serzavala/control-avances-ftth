import { connectDB } from '../../src/lib/db.js'
import { User } from '../../src/lib/models.js'
import { signToken } from '../../src/lib/auth.js'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  await connectDB()

  const { email, password } = req.body

  if (!email || !password)
    return res.status(400).json({ error: 'Email y password requeridos' })

  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })

  const token = signToken({ id: user._id, name: user.name, email: user.email })

  return res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } })
}

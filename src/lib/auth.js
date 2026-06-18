import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function getTokenFromHeader(req) {
  const auth = req.headers['authorization'] || ''
  if (!auth.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export function requireAuth(req) {
  const token = getTokenFromHeader(req)
  if (!token) return null
  return verifyToken(token)
}

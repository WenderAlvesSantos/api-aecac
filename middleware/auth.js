import { verifyToken, getTokenFromRequest } from '../lib/auth'

export function requireAuth(handler) {
  return async (req, res) => {
    const token = getTokenFromRequest(req)
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    req.userId = decoded.userId
    return handler(req, res)
  }
}


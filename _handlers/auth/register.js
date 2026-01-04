import clientPromise from '../../lib/mongodb'
import { hashPassword, generateToken } from '../../lib/auth'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default requireAuth(async function handler(req, res) {
  // Handle CORS preflight
  if (handleOptions(req, res)) {
    return
  }

  // Set CORS headers
  corsHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' })
    }

    const client = await clientPromise
    const db = client.db('aecac')

    // Verificar se o usuário já existe
    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' })
    }

    const hashedPassword = await hashPassword(password)

    const result = await db.collection('users').insertOne({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      name,
      tipo: 'admin', // Usuários criados pelo admin são admin
      createdAt: new Date(),
    })

    const token = generateToken(result.insertedId.toString())

    res.status(201).json({
      token,
      user: {
        id: result.insertedId.toString(),
        email,
        name,
      },
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})


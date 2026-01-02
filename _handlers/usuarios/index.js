import clientPromise from '../../lib/mongodb'
import { hashPassword } from '../../lib/auth'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')
        const users = await db.collection('users')
          .find({}, { projection: { password: 0 } }) // Não retornar senhas
          .sort({ createdAt: -1 })
          .toArray()
        
        res.status(200).json(users)
      } catch (error) {
        console.error('Erro ao buscar usuários:', error)
        res.status(500).json({ error: 'Erro ao buscar usuários' })
      }
    })(req, res)
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { email, password, name } = req.body

        if (!email || !password || !name) {
          return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se o usuário já existe
        const normalizedEmail = email.trim().toLowerCase()
        const existingUser = await db.collection('users').findOne({ 
          email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
        })
        
        if (existingUser) {
          return res.status(400).json({ error: 'Usuário já existe' })
        }

        const hashedPassword = await hashPassword(password)

        const result = await db.collection('users').insertOne({
          email: normalizedEmail,
          password: hashedPassword,
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const newUser = await db.collection('users').findOne(
          { _id: result.insertedId },
          { projection: { password: 0 } }
        )

        res.status(201).json(newUser)
      } catch (error) {
        console.error('Erro ao criar usuário:', error)
        res.status(500).json({ error: 'Erro ao criar usuário' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


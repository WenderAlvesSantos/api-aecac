import clientPromise from '../../lib/mongodb'
import { hashPassword } from '../../lib/auth'
import { requireAuth } from '../../middleware/auth'
import { ObjectId } from 'mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  const { id } = req.query

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')
        const user = await db.collection('users').findOne(
          { _id: new ObjectId(id) },
          { projection: { password: 0 } }
        )

        if (!user) {
          return res.status(404).json({ error: 'Usuário não encontrado' })
        }

        res.status(200).json(user)
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        res.status(500).json({ error: 'Erro ao buscar usuário' })
      }
    })(req, res)
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { name, email, password } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        const updateData = { updatedAt: new Date() }
        
        if (name) updateData.name = name
        
        if (email) {
          const normalizedEmail = email.trim().toLowerCase()
          // Verificar se email já está em uso por outro usuário
          const existingUser = await db.collection('users').findOne({
            email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
            _id: { $ne: new ObjectId(id) }
          })
          
          if (existingUser) {
            return res.status(400).json({ error: 'Email já está em uso' })
          }
          
          updateData.email = normalizedEmail
        }
        
        if (password) {
          updateData.password = await hashPassword(password)
        }

        const result = await db.collection('users').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' })
        }

        const updatedUser = await db.collection('users').findOne(
          { _id: new ObjectId(id) },
          { projection: { password: 0 } }
        )

        res.status(200).json(updatedUser)
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error)
        res.status(500).json({ error: 'Erro ao atualizar usuário' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se não é o último usuário
        const totalUsers = await db.collection('users').countDocuments()
        if (totalUsers <= 1) {
          return res.status(400).json({ error: 'Não é possível deletar o último usuário' })
        }

        const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' })
        }

        res.status(200).json({ message: 'Usuário deletado com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar usuário:', error)
        res.status(500).json({ error: 'Erro ao deletar usuário' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


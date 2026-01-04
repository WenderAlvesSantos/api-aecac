import clientPromise from '../../lib/mongodb'
import { hashPassword, comparePassword } from '../../lib/auth'
import { requireAuth } from '../../middleware/auth'
import { ObjectId } from 'mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'

async function handler(req, res) {
  corsHeaders(res)

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      
      // Tentar buscar primeiro na collection de associados
      let user = await db.collection('users_associados').findOne({ 
        _id: new ObjectId(req.userId) 
      })
      
      // Se não encontrou, buscar na collection de admins
      if (!user) {
        user = await db.collection('users').findOne({ 
          _id: new ObjectId(req.userId) 
        })
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      res.status(200).json({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        tipo: user.tipo || (user.empresaId ? 'associado' : 'admin'),
        empresaId: user.empresaId || null,
      })
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      res.status(500).json({ error: 'Erro ao buscar perfil' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, email, currentPassword, newPassword } = req.body

      const client = await clientPromise
      const db = client.db('aecac')
      
      // Tentar buscar primeiro na collection de associados
      let user = await db.collection('users_associados').findOne({ 
        _id: new ObjectId(req.userId) 
      })
      let isAssociado = !!user
      
      // Se não encontrou, buscar na collection de admins
      if (!user) {
        user = await db.collection('users').findOne({ 
          _id: new ObjectId(req.userId) 
        })
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      const updateData = { updatedAt: new Date() }

      // Atualizar nome
      if (name) {
        updateData.name = name
      }

      // Atualizar email (verificar se não existe)
      if (email && email !== user.email) {
        const normalizedEmail = email.toLowerCase().trim()
        
        // Verificar em ambas as collections
        const existingAssociado = await db.collection('users_associados').findOne({ 
          email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
          _id: { $ne: new ObjectId(req.userId) }
        })
        const existingAdmin = await db.collection('users').findOne({ 
          email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
          _id: { $ne: new ObjectId(req.userId) }
        })
        
        if (existingAssociado || existingAdmin) {
          return res.status(400).json({ error: 'Email já está em uso' })
        }
        updateData.email = normalizedEmail
      }

      // Atualizar senha (requer senha atual)
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' })
        }
        
        const isValidPassword = await comparePassword(currentPassword, user.password)
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Senha atual incorreta' })
        }

        updateData.password = await hashPassword(newPassword)
      }

      // Atualizar na collection correta
      const collection = isAssociado ? 'users_associados' : 'users'
      await db.collection(collection).updateOne(
        { _id: new ObjectId(req.userId) },
        { $set: updateData }
      )

      const updatedUser = await db.collection(collection).findOne({ 
        _id: new ObjectId(req.userId) 
      })

      res.status(200).json({
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        tipo: updatedUser.tipo || (updatedUser.empresaId ? 'associado' : 'admin'),
        empresaId: updatedUser.empresaId || null,
      })
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      res.status(500).json({ error: 'Erro ao atualizar perfil' })
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

export default async function(req, res) {
  // Tratar OPTIONS antes da autenticação
  if (handleOptions(req, res)) return
  
  // Aplicar autenticação apenas para métodos que não são OPTIONS
  return requireAuth(handler)(req, res)
}


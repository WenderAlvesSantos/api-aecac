import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { ObjectId } from 'mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'

// Configurar bodyParser para aceitar até 10MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  const { id } = req.query

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      const membro = await db.collection('diretoria').findOne({ _id: new ObjectId(id) })

      if (!membro) {
        return res.status(404).json({ error: 'Membro não encontrado' })
      }

      res.status(200).json(membro)
    } catch (error) {
      console.error('Erro ao buscar membro:', error)
      res.status(500).json({ error: 'Erro ao buscar membro' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, cargo, foto } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        const updateData = { updatedAt: new Date() }
        if (nome) updateData.nome = nome
        if (cargo) updateData.cargo = cargo
        // Sempre atualizar foto se foi enviada (pode ser null para remover)
        if (foto !== undefined) {
          updateData.foto = foto
        }

        const result = await db.collection('diretoria').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Membro não encontrado' })
        }

        const membro = await db.collection('diretoria').findOne({ _id: new ObjectId(id) })
        res.status(200).json(membro)
      } catch (error) {
        console.error('Erro ao atualizar membro:', error)
        res.status(500).json({ error: 'Erro ao atualizar membro' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        const result = await db.collection('diretoria').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Membro não encontrado' })
        }

        res.status(200).json({ message: 'Membro deletado com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar membro:', error)
        res.status(500).json({ error: 'Erro ao deletar membro' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


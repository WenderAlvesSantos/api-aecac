import clientPromise from '../../lib/mongodb'
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
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      const parceiro = await db.collection('parceiros').findOne({ _id: new ObjectId(id) })

      if (!parceiro) {
        return res.status(404).json({ error: 'Parceiro não encontrado' })
      }

      res.status(200).json(parceiro)
    } catch (error) {
      console.error('Erro ao buscar parceiro:', error)
      res.status(500).json({ error: 'Erro ao buscar parceiro' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, categoria, descricao, cor } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        const updateData = { updatedAt: new Date() }
        if (nome) updateData.nome = nome
        if (categoria) updateData.categoria = categoria
        if (descricao) updateData.descricao = descricao
        if (cor) updateData.cor = cor

        const result = await db.collection('parceiros').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Parceiro não encontrado' })
        }

        const parceiro = await db.collection('parceiros').findOne({ _id: new ObjectId(id) })
        res.status(200).json(parceiro)
      } catch (error) {
        console.error('Erro ao atualizar parceiro:', error)
        res.status(500).json({ error: 'Erro ao atualizar parceiro' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        const result = await db.collection('parceiros').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Parceiro não encontrado' })
        }

        res.status(200).json({ message: 'Parceiro deletado com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar parceiro:', error)
        res.status(500).json({ error: 'Erro ao deletar parceiro' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


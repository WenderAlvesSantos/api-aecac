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
      const imagem = await db.collection('galeria').findOne({ _id: new ObjectId(id) })

      if (!imagem) {
        return res.status(404).json({ error: 'Imagem não encontrada' })
      }

      res.status(200).json(imagem)
    } catch (error) {
      console.error('Erro ao buscar imagem:', error)
      res.status(500).json({ error: 'Erro ao buscar imagem' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { url, title, description, order } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        const updateData = { updatedAt: new Date() }
        if (url !== undefined) updateData.url = url
        if (title) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (order !== undefined) updateData.order = order

        const result = await db.collection('galeria').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Imagem não encontrada' })
        }

        const imagem = await db.collection('galeria').findOne({ _id: new ObjectId(id) })
        res.status(200).json(imagem)
      } catch (error) {
        console.error('Erro ao atualizar imagem:', error)
        res.status(500).json({ error: 'Erro ao atualizar imagem' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        const result = await db.collection('galeria').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Imagem não encontrada' })
        }

        res.status(200).json({ message: 'Imagem deletada com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar imagem:', error)
        res.status(500).json({ error: 'Erro ao deletar imagem' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { ObjectId } from 'mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'

// GET, PUT, DELETE - Operações em um evento específico
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
      const evento = await db.collection('eventos').findOne({ _id: new ObjectId(id) })

      if (!evento) {
        return res.status(404).json({ error: 'Evento não encontrado' })
      }

      res.status(200).json(evento)
    } catch (error) {
      console.error('Erro ao buscar evento:', error)
      res.status(500).json({ error: 'Erro ao buscar evento' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { titulo, descricao, data, hora, local, categoria, palestrante, vagas, vagasDisponiveis } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        const updateData = {
          updatedAt: new Date(),
        }

        if (titulo) updateData.titulo = titulo
        if (descricao) updateData.descricao = descricao
        if (data) updateData.data = data
        if (hora) updateData.hora = hora
        if (local) updateData.local = local
        if (categoria) updateData.categoria = categoria
        if (palestrante !== undefined) updateData.palestrante = palestrante
        if (vagas) updateData.vagas = parseInt(vagas)
        if (vagasDisponiveis !== undefined) updateData.vagasDisponiveis = parseInt(vagasDisponiveis)

        const result = await db.collection('eventos').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Evento não encontrado' })
        }

        const evento = await db.collection('eventos').findOne({ _id: new ObjectId(id) })
        res.status(200).json(evento)
      } catch (error) {
        console.error('Erro ao atualizar evento:', error)
        res.status(500).json({ error: 'Erro ao atualizar evento' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        const result = await db.collection('eventos').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Evento não encontrado' })
        }

        res.status(200).json({ message: 'Evento deletado com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar evento:', error)
        res.status(500).json({ error: 'Erro ao deletar evento' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


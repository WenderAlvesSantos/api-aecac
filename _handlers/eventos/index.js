import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

// GET - Listar eventos
export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleOptions(req, res)) {
    return
  }

  // Set CORS headers
  corsHeaders(res)

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      const eventos = await db
        .collection('eventos')
        .find({})
        .sort({ data: 1 })
        .toArray()

      res.status(200).json(eventos)
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
      res.status(500).json({ error: 'Erro ao buscar eventos' })
    }
  } else if (req.method === 'POST') {
    // POST - Criar evento (requer autenticação)
    return requireAuth(async (req, res) => {
      try {
        const { titulo, descricao, data, hora, local, categoria, palestrante, vagas } = req.body

        if (!titulo || !descricao || !data || !hora || !local || !categoria || !vagas) {
          return res.status(400).json({ error: 'Campos obrigatórios faltando' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const evento = {
          titulo,
          descricao,
          data,
          hora,
          local,
          categoria,
          palestrante: palestrante || null,
          vagas: parseInt(vagas),
          vagasDisponiveis: parseInt(vagas),
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('eventos').insertOne(evento)

        res.status(201).json({ ...evento, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar evento:', error)
        res.status(500).json({ error: 'Erro ao criar evento' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      const parceiros = await db.collection('parceiros').find({}).toArray()
      res.status(200).json(parceiros)
    } catch (error) {
      console.error('Erro ao buscar parceiros:', error)
      res.status(500).json({ error: 'Erro ao buscar parceiros' })
    }
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, categoria, descricao, cor } = req.body

        if (!nome || !categoria || !descricao) {
          return res.status(400).json({ error: 'Campos obrigatórios faltando' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const parceiro = {
          nome,
          categoria,
          descricao,
          cor: cor || '#1890ff',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('parceiros').insertOne(parceiro)
        res.status(201).json({ ...parceiro, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar parceiro:', error)
        res.status(500).json({ error: 'Erro ao criar parceiro' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


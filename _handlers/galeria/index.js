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
      const imagens = await db.collection('galeria').find({}).sort({ order: 1, createdAt: -1 }).toArray()
      res.status(200).json(imagens)
    } catch (error) {
      console.error('Erro ao buscar imagens:', error)
      res.status(500).json({ error: 'Erro ao buscar imagens' })
    }
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { url, title, description, order } = req.body

        if (!url || !title) {
          return res.status(400).json({ error: 'URL e título são obrigatórios' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const imagem = {
          url,
          title,
          description: description || '',
          order: order !== undefined ? order : 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('galeria').insertOne(imagem)
        res.status(201).json({ ...imagem, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar imagem:', error)
        res.status(500).json({ error: 'Erro ao criar imagem' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


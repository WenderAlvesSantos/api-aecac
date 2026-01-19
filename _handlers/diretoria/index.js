import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
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

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      // Ordenar por campo 'ordem' em ordem crescente
      const diretoria = await db.collection('diretoria').find({}).sort({ ordem: 1 }).toArray()
      res.status(200).json(diretoria)
    } catch (error) {
      console.error('Erro ao buscar diretoria:', error)
      res.status(500).json({ error: 'Erro ao buscar diretoria' })
    }
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, cargo, foto } = req.body

        if (!nome || !cargo) {
          return res.status(400).json({ error: 'Nome e cargo são obrigatórios' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Buscar a maior ordem existente
        const ultimoMembro = await db.collection('diretoria')
          .find({})
          .sort({ ordem: -1 })
          .limit(1)
          .toArray()
        
        const novaOrdem = ultimoMembro.length > 0 ? (ultimoMembro[0].ordem || 0) + 1 : 0

        const membro = {
          nome,
          cargo,
          foto: foto || null,
          ordem: novaOrdem,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('diretoria').insertOne(membro)
        res.status(201).json({ ...membro, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar membro da diretoria:', error)
        res.status(500).json({ error: 'Erro ao criar membro da diretoria' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


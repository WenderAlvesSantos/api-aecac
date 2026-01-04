import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const { status } = req.query // 'pendente', 'aprovado', 'rejeitado' ou todos
        const client = await clientPromise
        const db = client.db('aecac')

        const query = status ? { status } : {}
        const empresas = await db.collection('empresas')
          .find(query)
          .sort({ createdAt: -1 })
          .toArray()

        res.status(200).json(empresas)
      } catch (error) {
        console.error('Erro ao buscar empresas:', error)
        res.status(500).json({ error: 'Erro ao buscar empresas' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


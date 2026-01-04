import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const userId = req.userId

        const client = await clientPromise
        const db = client.db('aecac')

        await db.collection('notificacoes').updateMany(
          { userId, lida: false },
          { $set: { lida: true, updatedAt: new Date() } }
        )

        res.status(200).json({ message: 'Todas as notificações foram marcadas como lidas' })
      } catch (error) {
        console.error('Erro ao marcar notificações:', error)
        res.status(500).json({ error: 'Erro ao marcar notificações' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


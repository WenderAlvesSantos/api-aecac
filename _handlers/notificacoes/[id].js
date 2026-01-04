import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  const { id } = req.query

  if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { lida } = req.body
        const userId = req.userId

        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se a notificação pertence ao usuário
        const notificacao = await db.collection('notificacoes').findOne({ 
          _id: new ObjectId(id),
          userId 
        })

        if (!notificacao) {
          return res.status(404).json({ error: 'Notificação não encontrada' })
        }

        await db.collection('notificacoes').updateOne(
          { _id: new ObjectId(id) },
          { $set: { lida: lida !== undefined ? lida : true, updatedAt: new Date() } }
        )

        res.status(200).json({ message: 'Notificação atualizada com sucesso' })
      } catch (error) {
        console.error('Erro ao atualizar notificação:', error)
        res.status(500).json({ error: 'Erro ao atualizar notificação' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const userId = req.userId

        const client = await clientPromise
        const db = client.db('aecac')

        await db.collection('notificacoes').deleteOne({ 
          _id: new ObjectId(id),
          userId 
        })

        res.status(200).json({ message: 'Notificação deletada com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar notificação:', error)
        res.status(500).json({ error: 'Erro ao deletar notificação' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


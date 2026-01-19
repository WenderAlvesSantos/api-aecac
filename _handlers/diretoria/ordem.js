import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { membros } = req.body

        if (!Array.isArray(membros)) {
          return res.status(400).json({ error: 'Membros deve ser um array' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Atualizar ordem de todos os membros
        const updatePromises = membros.map((membro, index) => {
          return db.collection('diretoria').updateOne(
            { _id: new (require('mongodb').ObjectId)(membro._id) },
            { $set: { ordem: index, updatedAt: new Date() } }
          )
        })

        await Promise.all(updatePromises)

        res.status(200).json({ message: 'Ordem atualizada com sucesso' })
      } catch (error) {
        console.error('Erro ao atualizar ordem:', error)
        res.status(500).json({ error: 'Erro ao atualizar ordem' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


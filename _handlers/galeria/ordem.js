import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { ObjectId } from 'mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'

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

  if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { imagens } = req.body

        if (!Array.isArray(imagens)) {
          return res.status(400).json({ error: 'Lista de imagens inválida' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Atualizar ordem de cada imagem
        const updatePromises = imagens.map(({ id, order }) => {
          if (!ObjectId.isValid(id)) {
            return Promise.resolve(null)
          }
          return db.collection('galeria').updateOne(
            { _id: new ObjectId(id) },
            { 
              $set: { 
                order: order !== undefined ? order : 0,
                updatedAt: new Date()
              } 
            }
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


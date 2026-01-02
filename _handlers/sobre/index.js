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
      
      // Buscar ou criar documento único de "sobre"
      let sobre = await db.collection('sobre').findOne({})
      
      if (!sobre) {
        // Criar documento padrão se não existir
        const defaultSobre = {
          historia: '',
          missao: '',
          visao: '',
          valores: [],
          objetivos: [],
          updatedAt: new Date(),
        }
        const result = await db.collection('sobre').insertOne(defaultSobre)
        sobre = { ...defaultSobre, _id: result.insertedId }
      }

      res.status(200).json(sobre)
    } catch (error) {
      console.error('Erro ao buscar informações sobre:', error)
      res.status(500).json({ error: 'Erro ao buscar informações sobre' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { historia, missao, visao, valores, objetivos } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        const updateData = {
          updatedAt: new Date(),
        }

        if (historia !== undefined) updateData.historia = historia
        if (missao !== undefined) updateData.missao = missao
        if (visao !== undefined) updateData.visao = visao
        if (valores !== undefined) updateData.valores = valores
        if (objetivos !== undefined) updateData.objetivos = objetivos

        // Atualizar ou criar
        await db.collection('sobre').updateOne(
          {},
          { $set: updateData },
          { upsert: true }
        )

        const sobre = await db.collection('sobre').findOne({})
        res.status(200).json(sobre)
      } catch (error) {
        console.error('Erro ao atualizar informações sobre:', error)
        res.status(500).json({ error: 'Erro ao atualizar informações sobre' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


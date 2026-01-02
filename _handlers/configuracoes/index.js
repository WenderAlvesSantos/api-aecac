import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
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

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      if (!client) {
        throw new Error('Cliente MongoDB não conectado')
      }
      const db = client.db('aecac')
      
      // Buscar configurações ou retornar objeto vazio se não existir
      let configuracoes = await db.collection('configuracoes').findOne({})
      
      if (!configuracoes) {
        // Criar configurações padrão se não existir
        configuracoes = {
          contato: {
            telefone: '',
            email: '',
            endereco: '',
          },
          redesSociais: {
            facebook: '',
            instagram: '',
            linkedin: '',
          },
        }
        await db.collection('configuracoes').insertOne(configuracoes)
      }
      
      res.status(200).json(configuracoes)
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      res.status(500).json({ error: 'Erro ao buscar configurações' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { contato, redesSociais } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        // Buscar configurações existentes
        const existingConfig = await db.collection('configuracoes').findOne({})
        
        const updateData = {
          contato: contato || {},
          redesSociais: redesSociais || {},
          updatedAt: new Date(),
        }

        if (existingConfig) {
          // Atualizar configurações existentes
          await db.collection('configuracoes').updateOne(
            {},
            { $set: updateData }
          )
        } else {
          // Criar novas configurações
          updateData.createdAt = new Date()
          await db.collection('configuracoes').insertOne(updateData)
        }

        const configuracoes = await db.collection('configuracoes').findOne({})
        res.status(200).json(configuracoes)
      } catch (error) {
        console.error('Erro ao atualizar configurações:', error)
        res.status(500).json({ error: 'Erro ao atualizar configurações' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


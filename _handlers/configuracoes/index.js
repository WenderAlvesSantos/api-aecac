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
      console.log('=== GET CONFIGURACOES ===')
      console.log('MONGODB_URI configurada:', !!process.env.MONGODB_URI)
      
      const client = await clientPromise
      if (!client) {
        throw new Error('Cliente MongoDB não conectado')
      }
      console.log('Cliente MongoDB conectado')
      
      const db = client.db('aecac')
      console.log('Database aecac acessada')
      
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
          valorMensalidade: 100.00,
        }
        await db.collection('configuracoes').insertOne(configuracoes)
      }
      
      // Garantir que valorMensalidade existe (para configurações antigas)
      if (!configuracoes.valorMensalidade) {
        configuracoes.valorMensalidade = 100.00
      }
      
      console.log('Configurações encontradas:', !!configuracoes)
      res.status(200).json(configuracoes)
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      console.error('Stack:', error.stack)
      res.status(500).json({ 
        error: 'Erro ao buscar configurações',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { contato, redesSociais, valorMensalidade } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        // Buscar configurações existentes
        const existingConfig = await db.collection('configuracoes').findOne({})
        
        const updateData = {
          contato: contato || {},
          redesSociais: redesSociais || {},
          updatedAt: new Date(),
        }
        
        // Adicionar valorMensalidade se fornecido
        if (valorMensalidade !== undefined) {
          updateData.valorMensalidade = parseFloat(valorMensalidade) || 100.00
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


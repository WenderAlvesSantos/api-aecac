import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const userId = req.userId
        const { lida } = req.query

        const client = await clientPromise
        const db = client.db('aecac')

        const query = { userId }
        if (lida !== undefined) {
          query.lida = lida === 'true'
        }

        const notificacoes = await db.collection('notificacoes')
          .find(query)
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray()

        res.status(200).json(notificacoes)
      } catch (error) {
        console.error('Erro ao buscar notificações:', error)
        res.status(500).json({ error: 'Erro ao buscar notificações' })
      }
    })(req, res)
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { tipo, titulo, mensagem, link, userIds } = req.body

        if (!tipo || !titulo || !mensagem) {
          return res.status(400).json({ error: 'Tipo, título e mensagem são obrigatórios' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Se userIds não for fornecido, enviar para todos os usuários (admins e associados)
        let usuarios = []
        if (userIds && userIds.length > 0) {
          usuarios = userIds
        } else {
          // Buscar admins
          const allAdmins = await db.collection('users').find({}).toArray()
          // Buscar associados
          const allAssociados = await db.collection('users_associados').find({}).toArray()
          // Combinar ambos
          usuarios = [
            ...allAdmins.map(u => u._id.toString()),
            ...allAssociados.map(u => u._id.toString())
          ]
        }

        const notificacoes = usuarios.map(userId => ({
          userId,
          tipo, // 'beneficio', 'capacitacao', 'evento', 'geral'
          titulo,
          mensagem,
          link: link || null,
          lida: false,
          createdAt: new Date(),
        }))

        if (notificacoes.length > 0) {
          await db.collection('notificacoes').insertMany(notificacoes)
        }

        res.status(201).json({ 
          message: `${notificacoes.length} notificação(ões) criada(s) com sucesso`,
          count: notificacoes.length
        })
      } catch (error) {
        console.error('Erro ao criar notificações:', error)
        res.status(500).json({ error: 'Erro ao criar notificações' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


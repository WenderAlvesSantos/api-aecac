import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { getUserInfo } from '../../lib/userInfo'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const { eventoId } = req.query

        if (!eventoId) {
          return res.status(400).json({ error: 'ID do evento é obrigatório' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const userInfo = await getUserInfo(req.userId)
        if (!userInfo || !userInfo.isAssociado) {
          return res.status(403).json({ error: 'Acesso negado. Apenas associados podem visualizar inscritos.' })
        }

        // Buscar evento
        const evento = await db.collection('eventos').findOne({
          _id: new ObjectId(eventoId)
        })

        if (!evento) {
          return res.status(404).json({ error: 'Evento não encontrado' })
        }

        // Verificar se o evento pertence à empresa do associado
        const eventoEmpresaId = evento.empresaId?.toString() || evento.empresaId
        const userEmpresaId = userInfo.empresaId?.toString() || userInfo.empresaId
        if (!userInfo.empresaId || eventoEmpresaId !== userEmpresaId) {
          return res.status(403).json({ error: 'Você só pode visualizar inscritos dos eventos da sua empresa' })
        }

        // Buscar todas as inscrições da collection inscricoes_publicas
        const eventoIdStr = eventoId.toString()
        let todasInscricoes = []
        
        try {
          todasInscricoes = await db.collection('inscricoes_publicas').find({
            tipo: 'evento',
            $or: [
              { eventoId: eventoIdStr },
              { eventoId: new ObjectId(eventoId) }
            ]
          }).sort({ dataInscricao: -1 }).toArray()
        } catch (error) {
          console.error('Erro ao buscar inscrições:', error)
          todasInscricoes = []
        }

        // Mapear inscrições para o formato esperado
        const todosInscritos = todasInscricoes.map(inscricao => ({
          tipo: inscricao.tipoInscricao === 'privado' ? 'privado' : 'publico',
          nome: inscricao.nome || '',
          email: inscricao.email || null,
          cpf: inscricao.cpf || null,
          telefone: inscricao.telefone || null,
          dataInscricao: inscricao.dataInscricao || null,
        }))

        res.status(200).json(todosInscritos)
      } catch (error) {
        console.error('Erro ao buscar inscritos:', error)
        res.status(500).json({ error: 'Erro ao buscar inscritos' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


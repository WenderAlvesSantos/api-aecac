import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { getUserInfo } from '../../lib/userInfo'
import { ObjectId } from 'mongodb'

async function buscarInscritosEvento(db, eventoId) {
  const eventoIdStr = eventoId.toString()
  let todasInscricoes = []

  try {
    todasInscricoes = await db
      .collection('inscricoes_publicas')
      .find({
        tipo: 'evento',
        $or: [{ eventoId: eventoIdStr }, { eventoId: new ObjectId(eventoId) }],
      })
      .sort({ dataInscricao: -1 })
      .toArray()
  } catch (error) {
    console.error('Erro ao buscar inscrições:', error)
    todasInscricoes = []
  }

  return todasInscricoes.map((inscricao) => ({
    tipo: inscricao.tipoInscricao === 'privado' ? 'privado' : 'publico',
    nome: inscricao.nome || '',
    email: inscricao.email || null,
    cpf: inscricao.cpf || null,
    telefone: inscricao.telefone || null,
    dataInscricao: inscricao.dataInscricao || null,
  }))
}

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

        if (!ObjectId.isValid(eventoId)) {
          return res.status(400).json({ error: 'ID do evento inválido' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const userInfo = await getUserInfo(req.userId)
        if (!userInfo?.user) {
          return res.status(403).json({ error: 'Acesso negado' })
        }

        const evento = await db.collection('eventos').findOne({
          _id: new ObjectId(eventoId),
        })

        if (!evento) {
          return res.status(404).json({ error: 'Evento não encontrado' })
        }

        if (userInfo.isAdmin) {
          // Admin pode ver inscritos de qualquer evento (incl. eventos da AECAC)
        } else if (userInfo.isAssociado) {
          const eventoEmpresaId = evento.empresaId?.toString() || evento.empresaId
          const userEmpresaId = userInfo.empresaId?.toString() || userInfo.empresaId
          if (!userInfo.empresaId || eventoEmpresaId !== userEmpresaId) {
            return res.status(403).json({
              error: 'Você só pode visualizar inscritos dos eventos da sua empresa',
            })
          }
        } else {
          return res.status(403).json({ error: 'Acesso negado' })
        }

        const todosInscritos = await buscarInscritosEvento(db, eventoId)

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


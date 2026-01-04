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
        const { capacitacaoId } = req.query

        if (!capacitacaoId) {
          return res.status(400).json({ error: 'ID da capacitação é obrigatório' })
        }

        // Validar se o ID é um ObjectId válido
        if (!ObjectId.isValid(capacitacaoId)) {
          return res.status(400).json({ error: 'ID da capacitação inválido' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const userInfo = await getUserInfo(req.userId)
        if (!userInfo || !userInfo.isAssociado) {
          return res.status(403).json({ error: 'Acesso negado. Apenas associados podem visualizar inscritos.' })
        }

        // Buscar capacitação
        const capacitacao = await db.collection('capacitacoes').findOne({
          _id: new ObjectId(capacitacaoId)
        })

        if (!capacitacao) {
          return res.status(404).json({ error: 'Capacitação não encontrada' })
        }

        // Verificar se a capacitação pertence à empresa do associado
        const capacitacaoEmpresaId = capacitacao.empresaId?.toString() || capacitacao.empresaId
        const userEmpresaId = userInfo.empresaId?.toString() || userInfo.empresaId
        if (!userInfo.empresaId || capacitacaoEmpresaId !== userEmpresaId) {
          return res.status(403).json({ error: 'Você só pode visualizar inscritos das capacitações da sua empresa' })
        }

        // Buscar todas as inscrições da collection inscricoes_publicas
        const capacitacaoIdStr = capacitacaoId.toString()
        let todasInscricoes = []
        
        try {
          todasInscricoes = await db.collection('inscricoes_publicas').find({
            tipo: 'capacitacao',
            $or: [
              { capacitacaoId: capacitacaoIdStr },
              { capacitacaoId: new ObjectId(capacitacaoId) }
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
        console.error('Stack trace:', error.stack)
        res.status(500).json({ 
          error: 'Erro ao buscar inscritos',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


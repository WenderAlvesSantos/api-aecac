import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { capacitacaoId } = req.body
        const userId = req.userId

        if (!capacitacaoId) {
          return res.status(400).json({ error: 'ID da capacitação é obrigatório' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se a capacitação existe
        const capacitacao = await db.collection('capacitacoes').findOne({ _id: new ObjectId(capacitacaoId) })
        
        if (!capacitacao) {
          return res.status(404).json({ error: 'Capacitação não encontrada' })
        }

        // Buscar informações do usuário associado
        const usuario = await db.collection('users_associados').findOne({ _id: new ObjectId(userId) })
        if (!usuario) {
          return res.status(404).json({ error: 'Usuário não encontrado' })
        }

        const capacitacaoIdStr = capacitacaoId.toString()
        
        // Verificar se já está inscrito
        const inscricaoExistente = await db.collection('inscricoes_publicas').findOne({
          tipo: 'capacitacao',
          tipoInscricao: 'privado',
          userId: userId,
          $or: [
            { capacitacaoId: capacitacaoIdStr },
            { capacitacaoId: new ObjectId(capacitacaoId) }
          ]
        })

        if (inscricaoExistente) {
          return res.status(400).json({ error: 'Você já está inscrito nesta capacitação' })
        }

        // Verificar vagas disponíveis
        if (capacitacao.vagas) {
          const totalInscritos = await db.collection('inscricoes_publicas').countDocuments({
            tipo: 'capacitacao',
            $or: [
              { capacitacaoId: capacitacaoIdStr },
              { capacitacaoId: new ObjectId(capacitacaoId) }
            ]
          })
          
          if (totalInscritos >= capacitacao.vagas) {
            return res.status(400).json({ error: 'Não há vagas disponíveis' })
          }
        }

        // Adicionar inscrição na collection inscricoes_publicas
        await db.collection('inscricoes_publicas').insertOne({
          tipo: 'capacitacao',
          tipoInscricao: 'privado',
          capacitacaoId: capacitacaoIdStr,
          userId: userId,
          nome: usuario.name || 'Usuário Associado',
          email: usuario.email,
          cpf: null,
          telefone: null,
          dataInscricao: new Date(),
        })

        const updatedCapacitacao = await db.collection('capacitacoes').findOne({ _id: new ObjectId(capacitacaoId) })
        res.status(200).json({ message: 'Inscrição realizada com sucesso', capacitacao: updatedCapacitacao })
      } catch (error) {
        console.error('Erro ao inscrever em capacitação:', error)
        res.status(500).json({ error: 'Erro ao realizar inscrição' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        // Para DELETE, o body pode vir no req.body ou req.query
        const capacitacaoId = req.body?.capacitacaoId || req.query?.capacitacaoId
        const userId = req.userId

        if (!capacitacaoId) {
          return res.status(400).json({ error: 'ID da capacitação é obrigatório' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const capacitacaoIdStr = capacitacaoId.toString()
        
        // Remover inscrição da collection inscricoes_publicas
        await db.collection('inscricoes_publicas').deleteOne({
          tipo: 'capacitacao',
          tipoInscricao: 'privado',
          userId: userId,
          $or: [
            { capacitacaoId: capacitacaoIdStr },
            { capacitacaoId: new ObjectId(capacitacaoId) }
          ]
        })

        res.status(200).json({ message: 'Inscrição cancelada com sucesso' })
      } catch (error) {
        console.error('Erro ao cancelar inscrição:', error)
        res.status(500).json({ error: 'Erro ao cancelar inscrição' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


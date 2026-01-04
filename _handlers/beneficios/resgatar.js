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
        const { codigo } = req.body
        const userId = req.userId

        if (!codigo) {
          return res.status(400).json({ error: 'Código é obrigatório' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Buscar benefício pelo código
        const beneficio = await db.collection('beneficios').findOne({ codigo })

        if (!beneficio) {
          return res.status(404).json({ error: 'Código inválido' })
        }

        if (!beneficio.ativo) {
          return res.status(400).json({ error: 'Este benefício não está mais ativo' })
        }

        // Verificar validade
        if (beneficio.validade && new Date(beneficio.validade) < new Date()) {
          return res.status(400).json({ error: 'Este benefício expirou' })
        }

        // Verificar quantidade disponível
        const quantidadeUsada = beneficio.quantidadeUsada || 0
        if (beneficio.quantidade && quantidadeUsada >= beneficio.quantidade) {
          return res.status(400).json({ error: 'Este benefício esgotou' })
        }

        // Verificar se o usuário já resgatou este benefício
        const resgateExistente = await db.collection('resgates').findOne({
          userId,
          beneficioId: beneficio._id.toString(),
        })

        if (resgateExistente) {
          return res.status(400).json({ error: 'Você já resgatou este benefício' })
        }

        // Registrar resgate
        await db.collection('resgates').insertOne({
          userId,
          beneficioId: beneficio._id.toString(),
          codigo: beneficio.codigo,
          resgatadoEm: new Date(),
        })

        // Atualizar contador de uso
        await db.collection('beneficios').updateOne(
          { _id: beneficio._id },
          { 
            $inc: { quantidadeUsada: 1 },
            $set: { updatedAt: new Date() }
          }
        )

        res.status(200).json({ 
          message: 'Benefício resgatado com sucesso!',
          beneficio: {
            titulo: beneficio.titulo,
            descricao: beneficio.descricao,
            desconto: beneficio.desconto,
            condicoes: beneficio.condicoes,
          }
        })
      } catch (error) {
        console.error('Erro ao resgatar benefício:', error)
        res.status(500).json({ error: 'Erro ao resgatar benefício' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


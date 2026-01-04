import clientPromise from '../../lib/mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'POST') {
    try {
      const { capacitacaoId, nome, cpf, telefone } = req.body

      if (!capacitacaoId || !nome || !cpf || !telefone) {
        return res.status(400).json({ error: 'ID da capacitação, nome, CPF e telefone são obrigatórios' })
      }

      // Validar CPF (11 dígitos)
      const cpfLimpo = cpf.replace(/\D/g, '')
      if (cpfLimpo.length !== 11) {
        return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos.' })
      }

      const client = await clientPromise
      const db = client.db('aecac')

      // Verificar se a capacitação existe
      const capacitacao = await db.collection('capacitacoes').findOne({ 
        _id: new ObjectId(capacitacaoId) 
      })
      
      if (!capacitacao) {
        return res.status(404).json({ error: 'Capacitação não encontrada' })
      }

      // Verificar se já está inscrito (por CPF)
      const capacitacaoIdStr = capacitacaoId.toString()
      const inscricaoExistente = await db.collection('inscricoes_publicas').findOne({
        tipo: 'capacitacao',
        cpf: cpfLimpo,
        $or: [
          { capacitacaoId: capacitacaoIdStr },
          { capacitacaoId: new ObjectId(capacitacaoId) }
        ]
      })

      if (inscricaoExistente) {
        return res.status(409).json({ error: 'Este CPF já está inscrito nesta capacitação' })
      }

      // Verificar vagas disponíveis
      if (capacitacao.vagas) {
        // Contar todas as inscrições (públicas e privadas) da collection
        const totalInscritos = await db.collection('inscricoes_publicas').countDocuments({
          tipo: 'capacitacao',
          $or: [
            { capacitacaoId: capacitacaoIdStr },
            { capacitacaoId: new ObjectId(capacitacaoId) }
          ]
        })
        
        if (totalInscritos >= capacitacao.vagas) {
          return res.status(403).json({ error: 'Não há vagas disponíveis para esta capacitação' })
        }
      }

      // Registrar inscrição pública
      await db.collection('inscricoes_publicas').insertOne({
        tipo: 'capacitacao',
        tipoInscricao: 'publico',
        capacitacaoId: capacitacaoIdStr,
        nome,
        cpf: cpfLimpo,
        telefone,
        dataInscricao: new Date(),
      })

      res.status(200).json({ 
        message: 'Inscrição realizada com sucesso!',
        capacitacao: {
          titulo: capacitacao.titulo,
          data: capacitacao.data,
          local: capacitacao.local,
        }
      })
    } catch (error) {
      console.error('Erro ao inscrever em capacitação pública:', error)
      res.status(500).json({ error: 'Erro ao realizar inscrição' })
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


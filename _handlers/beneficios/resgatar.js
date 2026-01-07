import clientPromise from '../../lib/mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'POST') {
    try {
      const { codigo, nome, cpf, telefone } = req.body

      if (!codigo || !nome || !cpf || !telefone) {
        return res.status(400).json({ error: 'Código, nome, CPF e telefone são obrigatórios' })
      }

      // Validar CPF (11 dígitos)
      const cpfLimpo = cpf.replace(/\D/g, '')
      if (cpfLimpo.length !== 11) {
        return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos.' })
      }

      const client = await clientPromise
      const db = client.db('aecac')

      // Buscar benefício pelo código
      const beneficio = await db.collection('beneficios').findOne({ 
        codigo: codigo.toUpperCase().trim() 
      })

      if (!beneficio) {
        return res.status(404).json({ error: 'Benefício não encontrado ou código inválido' })
      }

      if (!beneficio.ativo) {
        return res.status(403).json({ error: 'Este benefício não está ativo no momento' })
      }

      if (beneficio.validade && new Date(beneficio.validade) < new Date()) {
        return res.status(403).json({ error: 'Este benefício expirou' })
      }

      // Verificar quantidade disponível
      if (beneficio.quantidade !== null) {
        // Contar todos os resgates (públicos e privados)
        const resgatesPrivados = await db.collection('resgates').countDocuments({
          beneficioId: beneficio._id.toString(),
        })
        
        const resgatesPublicos = await db.collection('resgates_publicos').countDocuments({
          beneficioId: beneficio._id.toString(),
        })
        
        const totalResgatado = resgatesPrivados + resgatesPublicos
        
        if (totalResgatado >= beneficio.quantidade) {
          return res.status(403).json({ error: 'Todas as unidades deste benefício foram resgatadas' })
        }
      }

      // Verificar se este CPF já resgatou este benefício
      const resgateExistentePublico = await db.collection('resgates_publicos').findOne({
        cpf: cpfLimpo,
        beneficioId: beneficio._id.toString(),
      })

      if (resgateExistentePublico) {
        return res.status(409).json({ error: 'Este CPF já resgatou este benefício anteriormente' })
      }

      // Registrar o resgate (sempre como público, com dados pessoais)
      await db.collection('resgates_publicos').insertOne({
        beneficioId: beneficio._id.toString(),
        codigo: beneficio.codigo,
        nome,
        cpf: cpfLimpo,
        telefone,
        dataResgate: new Date(),
      })

      // Atualizar updatedAt para manter consistência
      await db.collection('beneficios').updateOne(
        { _id: beneficio._id },
        { $set: { updatedAt: new Date() } }
      )

      res.status(200).json({ 
        message: 'Benefício resgatado com sucesso!',
        codigo: beneficio.codigo,
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
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


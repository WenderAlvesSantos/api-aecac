import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { getUserInfo } from '../../lib/userInfo'
import { ObjectId } from 'mongodb'

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
      const db = client.db('aecac')
      
      // Verificar se há token (usuário autenticado)
      const token = req.headers.authorization?.replace('Bearer ', '')
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0) // Zerar horas para comparar apenas a data
      
      let query = { ativo: true }
      
      // Para usuários não autenticados (área pública), filtrar também por validade
      if (!token) {
        query.$or = [
          { validade: null }, // Sem validade (sempre válido)
          { validade: { $gte: hoje } } // Validade maior ou igual a hoje
        ]
      }
      
      if (token) {
        // Se houver token, verificar se é associado para filtrar por empresa
        try {
          const { verifyToken } = await import('../../lib/auth')
          const decoded = verifyToken(token)
          if (decoded) {
            const userInfo = await getUserInfo(decoded.userId)
            if (userInfo.isAssociado && userInfo.empresaId) {
              // Associado só vê benefícios da própria empresa
              query.empresaId = userInfo.empresaId
            }
            // Admin vê todos os benefícios (query permanece { ativo: true })
          }
        } catch (error) {
          // Se houver erro ao verificar token, tratar como não autenticado
          query.$or = [
            { validade: null },
            { validade: { $gte: hoje } }
          ]
        }
      }
      
      // Buscar benefícios, ordenados por data de criação
      const beneficios = await db.collection('beneficios')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()
      
      // Verificar e inativar benefícios expirados (apenas para usuários autenticados)
      const beneficiosExpirados = beneficios.filter(ben => {
        return ben.ativo && ben.validade && new Date(ben.validade) < hoje
      })
      
      if (beneficiosExpirados.length > 0) {
        const idsExpirados = beneficiosExpirados.map(b => b._id)
        await db.collection('beneficios').updateMany(
          { _id: { $in: idsExpirados } },
          { $set: { ativo: false, updatedAt: new Date() } }
        )
        // Atualizar os benefícios na lista
        beneficios.forEach(ben => {
          if (idsExpirados.some(id => id.toString() === ben._id.toString())) {
            ben.ativo = false
          }
        })
      }
      
      // Calcular quantidade disponível considerando resgates públicos e privados
      const beneficiosComDisponibilidade = await Promise.all(
        beneficios.map(async (ben) => {
          if (ben.quantidade) {
            // Contar resgates privados (usuários logados)
            const resgatesPrivados = await db.collection('resgates').countDocuments({
              beneficioId: ben._id.toString(),
            })
            
            // Contar resgates públicos
            const resgatesPublicos = await db.collection('resgates_publicos').countDocuments({
              beneficioId: ben._id.toString(),
            })
            
            const totalResgatado = resgatesPrivados + resgatesPublicos
            ben.quantidadeDisponivel = ben.quantidade - totalResgatado
          } else {
            ben.quantidadeDisponivel = null // ilimitado
          }
          return ben
        })
      )
      
      res.status(200).json(beneficiosComDisponibilidade)
    } catch (error) {
      console.error('Erro ao buscar benefícios:', error)
      res.status(500).json({ error: 'Erro ao buscar benefícios' })
    }
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { titulo, descricao, empresaId, desconto, condicoes, validade, imagem, codigo, quantidade } = req.body

        if (!titulo || !descricao) {
          return res.status(400).json({ error: 'Título e descrição são obrigatórios' })
        }

        if (!codigo) {
          return res.status(400).json({ error: 'Código do benefício é obrigatório' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Obter informações do usuário
        const userInfo = await getUserInfo(req.userId)
        
        // Determinar empresaId: se for associado, usar o empresaId dele; senão, usar o fornecido
        let finalEmpresaId = empresaId
        if (userInfo.isAssociado) {
          if (!userInfo.empresaId) {
            return res.status(403).json({ error: 'Você não está vinculado a uma empresa' })
          }
          finalEmpresaId = userInfo.empresaId
        } else if (!empresaId) {
          return res.status(400).json({ error: 'Empresa é obrigatória' })
        }

        // Verificar se o código já existe
        const codigoExistente = await db.collection('beneficios').findOne({ codigo })
        if (codigoExistente) {
          return res.status(400).json({ error: 'Este código já está em uso' })
        }

        const beneficio = {
          titulo,
          descricao,
          empresaId: finalEmpresaId,
          codigo,
          desconto: desconto || null,
          condicoes: condicoes || '',
          validade: validade ? new Date(validade) : null,
          imagem: imagem || null,
          quantidade: quantidade || null, // Quantidade total disponível
          quantidadeUsada: 0, // Contador de quantos foram usados
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('beneficios').insertOne(beneficio)
        const newBeneficio = await db.collection('beneficios').findOne({ _id: result.insertedId })

        res.status(201).json(newBeneficio)
      } catch (error) {
        console.error('Erro ao criar benefício:', error)
        res.status(500).json({ error: 'Erro ao criar benefício' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


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
      
      // Verificar se é área pública (sem query parameter 'area=logged')
      // A área pública sempre retorna todos os itens (com e sem empresaId), independentemente de haver token
      const isPublicArea = req.query.area !== 'logged'
      const token = req.headers.authorization?.replace('Bearer ', '')
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0) // Zerar horas para comparar apenas a data
      
      let query = {}
      
      // Área pública: sempre retornar todos os itens (com e sem empresaId), mesmo com token
      if (isPublicArea) {
        query.$and = [
          {
            $or: [
              { ativo: true },
              { ativo: { $exists: false } }
            ]
          },
          {
            $or: [
              { validade: null }, // Sem validade (sempre válido)
              { validade: { $gte: hoje } } // Validade maior ou igual a hoje
            ]
          }
        ]
      } else if (token) {
        // Área logada: verificar se é associado ou admin
        try {
          const { verifyToken } = await import('../../lib/auth')
          const decoded = verifyToken(token)
          if (decoded) {
            const userInfo = await getUserInfo(decoded.userId)
            console.log('[BENEFICIOS] userInfo:', JSON.stringify({
              isAssociado: userInfo.isAssociado,
              empresaId: userInfo.empresaId,
              empresaIdType: typeof userInfo.empresaId
            }))
            if (userInfo.isAssociado && userInfo.empresaId) {
              // Associado só vê benefícios da própria empresa
              // Usar $or para buscar tanto como ObjectId quanto como string (compatibilidade)
              const empresaIdStr = userInfo.empresaId.toString()
              const empresaIdObj = ObjectId.isValid(empresaIdStr) ? new ObjectId(empresaIdStr) : null
              console.log('[BENEFICIOS] Filtrando por empresaId - String:', empresaIdStr, 'ObjectId:', empresaIdObj)
              query.$and = [
                { ativo: true },
                {
                  $or: [
                    { empresaId: empresaIdStr },
                    ...(empresaIdObj ? [{ empresaId: empresaIdObj }] : [])
                  ]
                }
              ]
              console.log('[BENEFICIOS] Query final:', JSON.stringify(query, null, 2))
            } else if (!userInfo.isAssociado) {
              // Admin vê apenas benefícios da AECAC (sem empresaId)
              query.$and = [
                { ativo: true },
                {
                  $or: [
                    { empresaId: null },
                    { empresaId: { $exists: false } }
                  ]
                }
              ]
            } else {
              // Se não for associado nem admin, ou associado sem empresaId
              query.ativo = true
            }
          } else {
            query.ativo = true
          }
        } catch (error) {
          // Se houver erro ao verificar token, tratar como área pública
          query.$and = [
            {
              $or: [
                { ativo: true },
                { ativo: { $exists: false } }
              ]
            },
            {
              $or: [
                { validade: null },
                { validade: { $gte: hoje } }
              ]
            }
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
          
          // Buscar dados da empresa se houver empresaId
          if (ben.empresaId) {
            try {
              const empresaId = typeof ben.empresaId === 'string' 
                ? new ObjectId(ben.empresaId) 
                : ben.empresaId
              const empresa = await db.collection('empresas').findOne({
                _id: empresaId
              })
              if (empresa) {
                ben.empresa = {
                  nome: empresa.nome,
                  imagem: empresa.imagem
                }
              }
            } catch (error) {
              console.error(`Erro ao buscar empresa para benefício ${ben._id.toString()}:`, error)
            }
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


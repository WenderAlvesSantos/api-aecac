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
        // Considerar ativo se não existir o campo ou se for true
        query.$or = [
          { ativo: true },
          { ativo: { $exists: false } }
        ]
      } else if (token) {
        // Área logada: verificar se é associado ou admin
        try {
          const { verifyToken } = await import('../../lib/auth')
          const decoded = verifyToken(token)
          if (decoded) {
            const userInfo = await getUserInfo(decoded.userId)
            console.log('[CAPACITACOES] userInfo:', JSON.stringify({
              isAssociado: userInfo.isAssociado,
              empresaId: userInfo.empresaId,
              empresaIdType: typeof userInfo.empresaId
            }))
            if (userInfo.isAssociado && userInfo.empresaId) {
              // Associado só vê capacitações da própria empresa
              // Usar $or para buscar tanto como ObjectId quanto como string (compatibilidade)
              const empresaIdStr = userInfo.empresaId.toString()
              const empresaIdObj = ObjectId.isValid(empresaIdStr) ? new ObjectId(empresaIdStr) : null
              console.log('[CAPACITACOES] Filtrando por empresaId - String:', empresaIdStr, 'ObjectId:', empresaIdObj)
              query.$and = [
                {
                  $or: [
                    { empresaId: empresaIdStr },
                    ...(empresaIdObj ? [{ empresaId: empresaIdObj }] : [])
                  ]
                }
              ]
              console.log('[CAPACITACOES] Query final:', JSON.stringify(query, null, 2))
            } else if (!userInfo.isAssociado) {
              // Admin vê apenas capacitações da AECAC (sem empresaId)
              query.$and = [
                {
                  $or: [
                    { empresaId: null },
                    { empresaId: { $exists: false } }
                  ]
                }
              ]
            }
          }
        } catch (error) {
          // Se houver erro ao verificar token, tratar como área pública
          query.$or = [
            { ativo: true },
            { ativo: { $exists: false } }
          ]
        }
      }
      
      // Buscar capacitações, ordenadas por data (próximas primeiro)
      let capacitacoes = await db.collection('capacitacoes')
        .find(query)
        .sort({ data: 1 })
        .toArray()
      
      // Para usuários não autenticados, filtrar novamente por data e ativo no código (garantia)
      if (!token) {
        capacitacoes = capacitacoes.filter(cap => {
          // Deve estar ativo (ativo !== false significa que pode ser true ou undefined/null)
          if (cap.ativo === false) return false
          // Deve ter data válida
          if (!cap.data) return false
          const dataCapacitacao = new Date(cap.data)
          dataCapacitacao.setHours(0, 0, 0, 0)
          return dataCapacitacao >= hoje
        })
      }
      
      // Verificar e inativar capacitações expiradas (data passou) - apenas para usuários autenticados
      const capacitacoesExpiradas = capacitacoes.filter(cap => {
        if (!cap.data) return false
        const dataCapacitacao = new Date(cap.data)
        dataCapacitacao.setHours(0, 0, 0, 0)
        // Se não tem campo ativo, considerar que está ativa e precisa ser inativada
        // Se tem campo ativo e está true, precisa ser inativada
        return (cap.ativo !== false) && dataCapacitacao < hoje
      })
      
      if (capacitacoesExpiradas.length > 0) {
        const idsExpirados = capacitacoesExpiradas.map(c => c._id)
        await db.collection('capacitacoes').updateMany(
          { _id: { $in: idsExpirados } },
          { $set: { ativo: false, updatedAt: new Date() } }
        )
        // Atualizar as capacitações na lista
        capacitacoes.forEach(cap => {
          if (idsExpirados.some(id => id.toString() === cap._id.toString())) {
            cap.ativo = false
          }
        })
      }
      
      // Calcular vagas disponíveis e buscar dados da empresa
      const capacitacoesComVagas = await Promise.all(
        capacitacoes.map(async (capacitacao) => {
          // Buscar todas as inscrições (públicas e privadas) da collection inscricoes_publicas
          const capacitacaoIdStr = capacitacao._id.toString()
          let totalInscritos = 0
          
          try {
            totalInscritos = await db.collection('inscricoes_publicas').countDocuments({
              tipo: 'capacitacao',
              $or: [
                { capacitacaoId: capacitacaoIdStr },
                { capacitacaoId: capacitacao._id }
              ]
            })
          } catch (error) {
            console.error(`Erro ao contar inscrições para capacitação ${capacitacaoIdStr}:`, error)
            totalInscritos = 0
          }
          
          if (capacitacao.vagas) {
            capacitacao.vagasDisponiveis = Math.max(0, capacitacao.vagas - totalInscritos)
          }
          // Adicionar também o total de inscritos para exibição
          capacitacao.totalInscritos = totalInscritos
          
          // Buscar dados da empresa se houver empresaId
          if (capacitacao.empresaId) {
            try {
              const empresaId = typeof capacitacao.empresaId === 'string' 
                ? new ObjectId(capacitacao.empresaId) 
                : capacitacao.empresaId
              const empresa = await db.collection('empresas').findOne({
                _id: empresaId
              })
              if (empresa) {
                capacitacao.empresa = {
                  nome: empresa.nome,
                  imagem: empresa.imagem
                }
              }
            } catch (error) {
              console.error(`Erro ao buscar empresa para capacitação ${capacitacaoIdStr}:`, error)
            }
          }
          
          return capacitacao
        })
      )
      
      res.status(200).json(capacitacoesComVagas)
    } catch (error) {
      console.error('Erro ao buscar capacitações:', error)
      res.status(500).json({ error: 'Erro ao buscar capacitações' })
    }
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { titulo, descricao, tipo, data, local, link, imagem, vagas, valor } = req.body

        if (!titulo || !descricao || !tipo || !data) {
          return res.status(400).json({ error: 'Título, descrição, tipo e data são obrigatórios' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Obter informações do usuário
        const userInfo = await getUserInfo(req.userId)
        
        // Se for associado, vincular à empresa dele
        let empresaId = null
        if (userInfo.isAssociado) {
          if (!userInfo.empresaId) {
            return res.status(403).json({ error: 'Você não está vinculado a uma empresa' })
          }
          empresaId = userInfo.empresaId
        }
        // Admin pode criar capacitações sem empresa (empresaId = null)

        const capacitacao = {
          titulo,
          descricao,
          tipo, // 'palestra', 'curso', 'workshop', 'treinamento'
          data: new Date(data),
          local: local || '',
          link: link || '',
          imagem: imagem || null,
          vagas: vagas || null,
          valor: valor || null,
          empresaId, // Vincular à empresa se for associado
          ativo: true, // Por padrão, capacitação é criada como ativa
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('capacitacoes').insertOne(capacitacao)
        const newCapacitacao = await db.collection('capacitacoes').findOne({ _id: result.insertedId })

        res.status(201).json(newCapacitacao)
      } catch (error) {
        console.error('Erro ao criar capacitação:', error)
        res.status(500).json({ error: 'Erro ao criar capacitação' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


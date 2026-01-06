import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { getUserInfo } from '../../lib/userInfo'
import { ObjectId } from 'mongodb'

// GET - Listar eventos
export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleOptions(req, res)) {
    return
  }

  // Set CORS headers
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
            console.log('[EVENTOS] userInfo:', JSON.stringify({
              isAssociado: userInfo.isAssociado,
              empresaId: userInfo.empresaId,
              empresaIdType: typeof userInfo.empresaId
            }))
            if (userInfo.isAssociado && userInfo.empresaId) {
              // Associado só vê eventos da própria empresa
              // Usar $or para buscar tanto como ObjectId quanto como string (compatibilidade)
              const empresaIdStr = userInfo.empresaId.toString()
              const empresaIdObj = ObjectId.isValid(empresaIdStr) ? new ObjectId(empresaIdStr) : null
              console.log('[EVENTOS] Filtrando por empresaId - String:', empresaIdStr, 'ObjectId:', empresaIdObj)
              query.$and = [
                {
                  $or: [
                    { empresaId: empresaIdStr },
                    ...(empresaIdObj ? [{ empresaId: empresaIdObj }] : [])
                  ]
                }
              ]
              console.log('[EVENTOS] Query final:', JSON.stringify(query, null, 2))
            } else if (!userInfo.isAssociado) {
              // Admin vê apenas eventos da AECAC (sem empresaId)
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
      
      let eventos = await db
        .collection('eventos')
        .find(query)
        .sort({ data: 1 })
        .toArray()

      // Para usuários não autenticados, filtrar novamente por data e ativo no código (garantia)
      if (!token) {
        eventos = eventos.filter(evt => {
          // Deve estar ativo (ativo !== false significa que pode ser true ou undefined/null)
          if (evt.ativo === false) return false
          // Deve ter data válida
          if (!evt.data) return false
          const dataEvento = new Date(evt.data)
          dataEvento.setHours(0, 0, 0, 0)
          return dataEvento >= hoje
        })
      }

      // Verificar e inativar eventos expirados (data passou) - apenas para usuários autenticados
      const eventosExpirados = eventos.filter(evt => {
        if (!evt.data) return false
        const dataEvento = new Date(evt.data)
        dataEvento.setHours(0, 0, 0, 0)
        // Se não tem campo ativo, considerar que está ativo e precisa ser inativado
        // Se tem campo ativo e está true, precisa ser inativado
        return (evt.ativo !== false) && dataEvento < hoje
      })
      
      if (eventosExpirados.length > 0) {
        const idsExpirados = eventosExpirados.map(e => e._id)
        await db.collection('eventos').updateMany(
          { _id: { $in: idsExpirados } },
          { $set: { ativo: false, updatedAt: new Date() } }
        )
        // Atualizar os eventos na lista
        eventos.forEach(evt => {
          if (idsExpirados.some(id => id.toString() === evt._id.toString())) {
            evt.ativo = false
          }
        })
      }

      // Calcular vagas disponíveis e buscar dados da empresa
      const eventosComVagas = await Promise.all(
        eventos.map(async (evento) => {
          const eventoIdStr = evento._id.toString()
          let totalInscritos = 0
          
          try {
            totalInscritos = await db.collection('inscricoes_publicas').countDocuments({
              tipo: 'evento',
              $or: [
                { eventoId: eventoIdStr },
                { eventoId: evento._id }
              ]
            })
          } catch (error) {
            console.error(`Erro ao contar inscrições para evento ${eventoIdStr}:`, error)
            totalInscritos = 0
          }
          
          if (evento.vagas) {
            evento.vagasDisponiveis = Math.max(0, evento.vagas - totalInscritos)
          }
          evento.totalInscritos = totalInscritos
          
          // Buscar dados da empresa se houver empresaId
          if (evento.empresaId) {
            try {
              const empresaId = typeof evento.empresaId === 'string' 
                ? new ObjectId(evento.empresaId) 
                : evento.empresaId
              const empresa = await db.collection('empresas').findOne({
                _id: empresaId
              })
              if (empresa) {
                evento.empresa = {
                  nome: empresa.nome,
                  imagem: empresa.imagem
                }
              }
            } catch (error) {
              console.error(`Erro ao buscar empresa para evento ${eventoIdStr}:`, error)
            }
          }
          
          return evento
        })
      )

      res.status(200).json(eventosComVagas)
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
      res.status(500).json({ error: 'Erro ao buscar eventos' })
    }
  } else if (req.method === 'POST') {
    // POST - Criar evento (requer autenticação)
    return requireAuth(async (req, res) => {
      try {
        const { titulo, descricao, data, hora, local, categoria, palestrante, vagas } = req.body

        if (!titulo || !descricao || !data || !hora || !local || !categoria || !vagas) {
          return res.status(400).json({ error: 'Campos obrigatórios faltando' })
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
        // Admin pode criar eventos sem empresa (empresaId = null)

        const evento = {
          titulo,
          descricao,
          data,
          hora,
          local,
          categoria,
          palestrante: palestrante || null,
          vagas: parseInt(vagas),
          vagasDisponiveis: parseInt(vagas),
          empresaId, // Vincular à empresa se for associado
          ativo: true, // Por padrão, evento é criado como ativo
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('eventos').insertOne(evento)

        res.status(201).json({ ...evento, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar evento:', error)
        res.status(500).json({ error: 'Erro ao criar evento' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


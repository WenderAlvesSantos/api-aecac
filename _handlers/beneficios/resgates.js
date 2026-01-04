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
        const client = await clientPromise
        const db = client.db('aecac')

        const userInfo = await getUserInfo(req.userId)
        if (!userInfo || !userInfo.isAssociado) {
          return res.status(403).json({ error: 'Acesso negado. Apenas associados podem visualizar resgates.' })
        }

        if (!userInfo.empresaId) {
          return res.status(403).json({ error: 'Você não está vinculado a uma empresa' })
        }

        // Buscar todos os benefícios da empresa do associado
        // Tentar tanto com ObjectId quanto com string para garantir compatibilidade
        const empresaIdObj = new ObjectId(userInfo.empresaId)
        const empresaIdStr = userInfo.empresaId.toString()
        
        const beneficios = await db.collection('beneficios').find({
          $or: [
            { empresaId: empresaIdObj },
            { empresaId: empresaIdStr }
          ]
        }).toArray()

        console.log('Benefícios encontrados para empresa:', beneficios.length)
        console.log('EmpresaId do associado:', userInfo.empresaId)

        const beneficioIds = beneficios.map(b => b._id.toString())

        console.log('Benefício IDs (string):', beneficioIds)
        console.log('Primeiro benefício exemplo:', beneficios[0] ? {
          _id: beneficios[0]._id.toString(),
          empresaId: beneficios[0].empresaId,
          empresaIdType: typeof beneficios[0].empresaId,
          titulo: beneficios[0].titulo
        } : 'Nenhum benefício encontrado')

        // Buscar resgates privados (usuários logados)
        // beneficioId nos resgates está como string
        const resgatesPrivados = await db.collection('resgates').find({
          beneficioId: { $in: beneficioIds }
        }).sort({ resgatadoEm: -1 }).toArray()

        // Buscar resgates públicos
        // beneficioId nos resgates está como string
        const resgatesPublicos = await db.collection('resgates_publicos').find({
          beneficioId: { $in: beneficioIds }
        }).sort({ dataResgate: -1 }).toArray()
        
        console.log('Exemplo de resgate público:', resgatesPublicos[0] || 'Nenhum resgate público encontrado')

        console.log('Resgates privados encontrados:', resgatesPrivados.length)
        console.log('Resgates públicos encontrados:', resgatesPublicos.length)
        console.log('Benefício IDs:', beneficioIds)

        // Combinar e formatar os resgates
        const todosResgates = [
          ...resgatesPrivados.map(r => ({
            ...r,
            tipo: 'privado',
            dataResgate: r.resgatadoEm,
            nome: 'Usuário Associado', // Resgates privados não têm nome/CPF
            cpf: null,
            telefone: null,
          })),
          ...resgatesPublicos.map(r => ({
            ...r,
            tipo: 'publico',
            dataResgate: r.dataResgate,
            // Garantir que nome, cpf e telefone estão presentes
            nome: r.nome || '',
            cpf: r.cpf || '',
            telefone: r.telefone || '',
          }))
        ]

        console.log('Total de resgates combinados:', todosResgates.length)
        console.log('Resgates públicos formatados:', todosResgates.filter(r => r.tipo === 'publico'))

        // Ordenar por data (mais recentes primeiro)
        todosResgates.sort((a, b) => new Date(b.dataResgate) - new Date(a.dataResgate))

        // Adicionar informações do benefício a cada resgate
        const resgatesComBeneficio = todosResgates.map(resgate => {
          const beneficio = beneficios.find(b => b._id.toString() === resgate.beneficioId)
          return {
            ...resgate,
            beneficio: beneficio ? {
              _id: beneficio._id,
              titulo: beneficio.titulo,
              codigo: beneficio.codigo,
              ativo: beneficio.ativo,
              validade: beneficio.validade,
            } : null,
          }
        })

        res.status(200).json(resgatesComBeneficio)
      } catch (error) {
        console.error('Erro ao buscar resgates:', error)
        res.status(500).json({ error: 'Erro ao buscar resgates' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const { tipo } = req.query
        const client = await clientPromise
        const db = client.db('aecac')

        let relatorio = {}

        if (tipo === 'inscricoes' || !tipo) {
          // Relatório de inscrições em capacitações
          const capacitacoes = await db.collection('capacitacoes').find({}).toArray()
          
          // Buscar contagem de inscrições para cada capacitação
          const inscricoesData = await Promise.all(
            capacitacoes.map(async (cap) => {
              const capacitacaoIdStr = cap._id.toString()
              const totalInscritos = await db.collection('inscricoes_publicas').countDocuments({
                tipo: 'capacitacao',
                $or: [
                  { capacitacaoId: capacitacaoIdStr },
                  { capacitacaoId: cap._id }
                ]
              })
              
              return {
                id: cap._id.toString(),
                titulo: cap.titulo,
                tipo: cap.tipo,
                data: cap.data,
                vagas: cap.vagas || 0,
                inscritos: totalInscritos,
                taxaOcupacao: cap.vagas 
                  ? ((totalInscritos / cap.vagas) * 100).toFixed(2) + '%'
                  : 'Ilimitadas',
              }
            })
          )

          relatorio.inscricoes = {
            total: capacitacoes.length,
            totalInscritos: inscricoesData.reduce((acc, item) => acc + item.inscritos, 0),
            detalhes: inscricoesData,
          }
        }

        if (tipo === 'beneficios' || !tipo) {
          // Relatório de benefícios
          const beneficios = await db.collection('beneficios').find({}).toArray()
          
          const beneficiosAtivos = beneficios.filter(b => b.ativo).length
          const beneficiosExpirados = beneficios.filter(b => {
            if (!b.validade) return false
            return new Date(b.validade) < new Date()
          }).length

          relatorio.beneficios = {
            total: beneficios.length,
            ativos: beneficiosAtivos,
            expirados: beneficiosExpirados,
            inativos: beneficios.length - beneficiosAtivos - beneficiosExpirados,
            detalhes: beneficios.map(b => ({
              id: b._id.toString(),
              titulo: b.titulo,
              empresaId: b.empresaId,
              desconto: b.desconto,
              ativo: b.ativo,
              validade: b.validade,
            })),
          }
        }

        if (tipo === 'empresas' || !tipo) {
          // Relatório de empresas
          const empresas = await db.collection('empresas').find({}).toArray()
          
          const empresasPorCategoria = {}
          empresas.forEach(emp => {
            empresasPorCategoria[emp.categoria] = (empresasPorCategoria[emp.categoria] || 0) + 1
          })

          relatorio.empresas = {
            total: empresas.length,
            porCategoria: empresasPorCategoria,
            comImagem: empresas.filter(e => e.imagem).length,
            semImagem: empresas.filter(e => !e.imagem).length,
          }
        }

        if (tipo === 'usuarios' || !tipo) {
          // Relatório de usuários (admins e associados)
          const admins = await db.collection('users').find({}).toArray()
          const associados = await db.collection('users_associados').find({}).toArray()
          
          relatorio.usuarios = {
            total: admins.length + associados.length,
            admins: admins.length,
            associados: associados.length,
            detalhes: {
              admins: admins.map(u => ({
                id: u._id.toString(),
                nome: u.name,
                email: u.email,
                tipo: 'admin',
                createdAt: u.createdAt,
              })),
              associados: associados.map(u => ({
                id: u._id.toString(),
                nome: u.name,
                email: u.email,
                tipo: 'associado',
                empresaId: u.empresaId,
                createdAt: u.createdAt,
              })),
            },
          }
        }

        res.status(200).json(relatorio)
      } catch (error) {
        console.error('Erro ao gerar relatório:', error)
        res.status(500).json({ error: 'Erro ao gerar relatório' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


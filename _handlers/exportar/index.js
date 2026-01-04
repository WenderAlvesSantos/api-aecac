import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const { tipo, formato } = req.query
        const client = await clientPromise
        const db = client.db('aecac')

        let dados = []
        let filename = 'export'
        let contentType = 'application/json'

        if (tipo === 'empresas') {
          const empresas = await db.collection('empresas').find({}).toArray()
          dados = empresas.map(emp => ({
            nome: emp.nome,
            categoria: emp.categoria,
            descricao: emp.descricao,
            telefone: emp.telefone,
            email: emp.email,
            endereco: emp.endereco,
            site: emp.site,
            facebook: emp.facebook,
            instagram: emp.instagram,
            linkedin: emp.linkedin,
            dataCadastro: emp.createdAt,
          }))
          filename = 'empresas'
        } else if (tipo === 'usuarios') {
          // Buscar admins e associados
          const admins = await db.collection('users').find({}).toArray()
          const associados = await db.collection('users_associados').find({}).toArray()
          
          dados = [
            ...admins.map(usr => ({
              nome: usr.name,
              email: usr.email,
              tipo: 'admin',
              dataCadastro: usr.createdAt,
            })),
            ...associados.map(usr => ({
              nome: usr.name,
              email: usr.email,
              tipo: 'associado',
              empresaId: usr.empresaId,
              dataCadastro: usr.createdAt,
            }))
          ]
          filename = 'usuarios'
        } else if (tipo === 'capacitacoes') {
          const capacitacoes = await db.collection('capacitacoes').find({}).toArray()
          
          // Buscar contagem de inscrições para cada capacitação
          dados = await Promise.all(
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
                titulo: cap.titulo,
                tipo: cap.tipo,
                descricao: cap.descricao,
                data: cap.data,
                local: cap.local,
                vagas: cap.vagas,
                valor: cap.valor,
                inscritos: totalInscritos,
              }
            })
          )
          filename = 'capacitacoes'
        } else if (tipo === 'beneficios') {
          const beneficios = await db.collection('beneficios').find({}).toArray()
          dados = beneficios.map(ben => ({
            titulo: ben.titulo,
            descricao: ben.descricao,
            desconto: ben.desconto,
            condicoes: ben.condicoes,
            validade: ben.validade,
            ativo: ben.ativo,
          }))
          filename = 'beneficios'
        } else {
          return res.status(400).json({ error: 'Tipo de exportação inválido' })
        }

        if (formato === 'csv') {
          // Converter para CSV
          if (dados.length === 0) {
            return res.status(400).json({ error: 'Nenhum dado para exportar' })
          }

          const headers = Object.keys(dados[0])
          const csvRows = [
            headers.join(','),
            ...dados.map(row => 
              headers.map(header => {
                const value = row[header]
                if (value === null || value === undefined) return ''
                // Escapar vírgulas e aspas
                const stringValue = String(value).replace(/"/g, '""')
                return `"${stringValue}"`
              }).join(',')
            ),
          ]

          const csv = csvRows.join('\n')
          contentType = 'text/csv'
          res.setHeader('Content-Type', contentType)
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
          return res.status(200).send(csv)
        } else {
          // JSON (padrão)
          res.setHeader('Content-Type', contentType)
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
          return res.status(200).json(dados)
        }
      } catch (error) {
        console.error('Erro ao exportar dados:', error)
        res.status(500).json({ error: 'Erro ao exportar dados' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'
import { enviarEmailAprovacao, enviarEmailRejeicao } from '../../lib/email'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { empresaId, acao } = req.body // acao: 'aprovar' ou 'rejeitar'

        if (!empresaId || !acao) {
          return res.status(400).json({ error: 'ID da empresa e ação são obrigatórios' })
        }

        if (acao !== 'aprovar' && acao !== 'rejeitar') {
          return res.status(400).json({ error: 'Ação deve ser "aprovar" ou "rejeitar"' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const status = acao === 'aprovar' ? 'aprovado' : 'rejeitado'

        await db.collection('empresas').updateOne(
          { _id: new ObjectId(empresaId) },
          { 
            $set: { 
              status,
              updatedAt: new Date(),
              aprovadoEm: acao === 'aprovar' ? new Date() : null,
              aprovadoPor: req.userId,
            }
          }
        )

        const empresa = await db.collection('empresas').findOne({ _id: new ObjectId(empresaId) })
        
        // Enviar email de aprovação ou rejeição
        if (empresa.email) {
          if (acao === 'aprovar') {
            // Enviar email de aprovação
            await enviarEmailAprovacao(empresa).catch(error => {
              console.error('Erro ao enviar email de aprovação:', error)
              // Não falhar a aprovação se o email falhar
            })
          } else if (acao === 'rejeitar') {
            // Enviar email de rejeição
            await enviarEmailRejeicao(empresa).catch(error => {
              console.error('Erro ao enviar email de rejeição:', error)
              // Não falhar a rejeição se o email falhar
            })
          }
        }
        
        // Se aprovada, criar notificação para o email da empresa
        if (acao === 'aprovar' && empresa.email) {
          try {
            // Buscar se já existe um usuário associado com este email
            const normalizedEmail = empresa.email.trim().toLowerCase()
            const usuarioAssociado = await db.collection('users_associados').findOne({
              email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            })

            if (usuarioAssociado) {
              // Se já existe usuário, enviar notificação diretamente
              await db.collection('notificacoes').insertOne({
                userId: usuarioAssociado._id.toString(),
                tipo: 'geral',
                titulo: 'Empresa Aprovada! 🎉',
                mensagem: `Sua empresa "${empresa.nome}" foi aprovada! Agora você pode acessar todos os benefícios exclusivos da AECAC.`,
                link: '/associado',
                lida: false,
                createdAt: new Date(),
              })
            } else {
              // Se não existe usuário ainda, criar notificação pendente vinculada ao email
              // Esta será vinculada quando o usuário se registrar
              await db.collection('notificacoes_pendentes').insertOne({
                email: normalizedEmail,
                tipo: 'geral',
                titulo: 'Empresa Aprovada! 🎉',
                mensagem: `Sua empresa "${empresa.nome}" foi aprovada! Crie sua conta de associado para acessar todos os benefícios exclusivos.`,
                link: '/associado/login',
                empresaId: empresaId,
                createdAt: new Date(),
              })
            }
          } catch (error) {
            console.error('Erro ao criar notificação de aprovação:', error)
            // Não falhar a aprovação se a notificação falhar
          }
        }
        
        res.status(200).json({ 
          message: `Empresa ${acao === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso`,
          empresa 
        })
      } catch (error) {
        console.error('Erro ao aprovar/rejeitar empresa:', error)
        res.status(500).json({ error: 'Erro ao processar solicitação' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


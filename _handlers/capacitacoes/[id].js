import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'
import { getUserInfo } from '../../lib/userInfo'

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

  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      
      const capacitacao = await db.collection('capacitacoes').findOne({ _id: new ObjectId(id) })
      
      if (!capacitacao) {
        return res.status(404).json({ error: 'Capacitação não encontrada' })
      }
      
      res.status(200).json(capacitacao)
    } catch (error) {
      console.error('Erro ao buscar capacitação:', error)
      res.status(500).json({ error: 'Erro ao buscar capacitação' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { titulo, descricao, tipo, data, local, link, imagem, vagas, valor } = req.body
        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se o usuário tem permissão para editar esta capacitação
        const userInfo = await getUserInfo(req.userId)
        const capacitacao = await db.collection('capacitacoes').findOne({ _id: new ObjectId(id) })
        
        if (!capacitacao) {
          return res.status(404).json({ error: 'Capacitação não encontrada' })
        }

        // Associado só pode editar capacitações da própria empresa
        if (userInfo.isAssociado) {
          const capacitacaoEmpresaId = capacitacao.empresaId?.toString() || capacitacao.empresaId
          const userEmpresaId = userInfo.empresaId?.toString() || userInfo.empresaId
          if (!userInfo.empresaId || capacitacaoEmpresaId !== userEmpresaId) {
            return res.status(403).json({ error: 'Você só pode editar capacitações da sua empresa' })
          }
        }

        const updateData = {
          updatedAt: new Date(),
        }

        if (titulo !== undefined) updateData.titulo = titulo
        if (descricao !== undefined) updateData.descricao = descricao
        if (tipo !== undefined) updateData.tipo = tipo
        if (data !== undefined) updateData.data = new Date(data)
        if (local !== undefined) updateData.local = local
        if (link !== undefined) updateData.link = link
        if (imagem !== undefined) updateData.imagem = imagem
        if (vagas !== undefined) updateData.vagas = vagas
        if (valor !== undefined) updateData.valor = valor

        await db.collection('capacitacoes').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        const capacitacaoAtualizada = await db.collection('capacitacoes').findOne({ _id: new ObjectId(id) })
        res.status(200).json(capacitacaoAtualizada)
      } catch (error) {
        console.error('Erro ao atualizar capacitação:', error)
        res.status(500).json({ error: 'Erro ao atualizar capacitação' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se o usuário tem permissão para deletar esta capacitação
        const userInfo = await getUserInfo(req.userId)
        const capacitacao = await db.collection('capacitacoes').findOne({ _id: new ObjectId(id) })
        
        if (!capacitacao) {
          return res.status(404).json({ error: 'Capacitação não encontrada' })
        }

        // Associado só pode deletar capacitações da própria empresa
        if (userInfo.isAssociado) {
          const capacitacaoEmpresaId = capacitacao.empresaId?.toString() || capacitacao.empresaId
          const userEmpresaId = userInfo.empresaId?.toString() || userInfo.empresaId
          if (!userInfo.empresaId || capacitacaoEmpresaId !== userEmpresaId) {
            return res.status(403).json({ error: 'Você só pode excluir capacitações da sua empresa' })
          }
        }

        await db.collection('capacitacoes').deleteOne({ _id: new ObjectId(id) })
        res.status(200).json({ message: 'Capacitação deletada com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar capacitação:', error)
        res.status(500).json({ error: 'Erro ao deletar capacitação' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}


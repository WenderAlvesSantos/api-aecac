import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'ID é obrigatório' })
  }

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')
        const documento = await db.collection('documentos').findOne({ _id: new ObjectId(id) })

        if (!documento) {
          return res.status(404).json({ error: 'Documento não encontrado' })
        }

        res.status(200).json(documento)
      } catch (error) {
        console.error('Erro ao buscar documento:', error)
        res.status(500).json({ error: 'Erro ao buscar documento' })
      }
    })(req, res)
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, categoria, arquivo, tipoArquivo, tamanhoArquivo } = req.body

        const client = await clientPromise
        const db = client.db('aecac')

        // Obter informações do usuário logado
        const userId = req.userId
        
        // Buscar usuário na collection de admins
        let user = null
        let nomeUsuario = 'Admin'
        
        if (ObjectId.isValid(userId)) {
          user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
          if (user) {
            nomeUsuario = user.name || user.email || 'Admin'
          }
        }

        const updateData = {
          updatedAt: new Date(),
          atualizadoPor: {
            userId,
            nome: nomeUsuario,
          },
        }

        if (nome) updateData.nome = nome
        if (categoria) updateData.categoria = categoria
        if (arquivo) {
          updateData.arquivo = arquivo
          if (tipoArquivo) updateData.tipoArquivo = tipoArquivo
          if (tamanhoArquivo) updateData.tamanhoArquivo = tamanhoArquivo
        }

        const result = await db.collection('documentos').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Documento não encontrado' })
        }

        const documentoAtualizado = await db.collection('documentos').findOne({ _id: new ObjectId(id) })
        res.status(200).json(documentoAtualizado)
      } catch (error) {
        console.error('Erro ao atualizar documento:', error)
        res.status(500).json({ error: 'Erro ao atualizar documento' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        const result = await db.collection('documentos').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Documento não encontrado' })
        }

        res.status(200).json({ message: 'Documento deletado com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar documento:', error)
        res.status(500).json({ error: 'Erro ao deletar documento' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

